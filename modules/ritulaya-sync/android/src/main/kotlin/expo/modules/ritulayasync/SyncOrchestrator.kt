package expo.modules.ritulayasync

import android.content.Context
import android.content.SharedPreferences
import expo.modules.ritulayadb.CycleEntity
import expo.modules.ritulayadb.DayLogEntity
import expo.modules.ritulayadb.RitulayaDataStore
import expo.modules.ritulayadb.SettingsEntity
import expo.modules.ritulayadb.SyncTombstoneEntity
import expo.modules.ritulayasync.CsvHandler.CycleRow
import expo.modules.ritulayasync.CsvHandler.DayLogRow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class SyncOrchestrator(
    private val appContext: Context,
    private val prefs: SharedPreferences,
) {
    private val tokenStore = SecureTokenStore(appContext)
    private val dataStore = RitulayaDataStore(appContext)

    companion object {
        // Mirrors the SyncStatus union on the TS side (src/types/sync.ts).
        private const val STATUS_IDLE = "idle"
        private const val STATUS_SYNCING = "syncing"
        private const val STATUS_IN_SYNC = "inSync"
        private const val STATUS_ERROR = "error"

        /** How long a persisted "syncing" status is trusted before a read treats it as crashed. */
        private const val SYNCING_STALE_MS = 10 * 60 * 1000L

        // Serializes syncs across orchestrator instances (JS syncNow vs background worker).
        private val syncMutex = Mutex()
    }

    suspend fun sync(): Map<String, Any?> {
        val token = tokenStore.load("github_token")
        if (token == null) return notRunResult()

        val owner = prefs.getString("repo_owner", null)
        if (owner == null) return notRunResult()
        val repo = prefs.getString("repo_name", null)
        if (repo == null) return notRunResult()
        val branch = prefs.getString("repo_branch", "main")!!

        val api = GithubApiClient(token)

        setStatus(STATUS_SYNCING)
        return try {
            syncMutex.withLock { fetchMergePush(api, owner, repo, branch) }
        } catch (e: Exception) {
            val failures = prefs.getInt("consecutive_failures", 0) + 1
            prefs.edit().putInt("consecutive_failures", failures).apply()
            if (failures >= 3) {
                prefs.edit().putBoolean("sync_warning", true).apply()
            }
            setStatus(STATUS_ERROR)
            statusSnapshot()
        }
    }

    private fun setStatus(status: String) {
        val editor = prefs.edit().putString("sync_status", status)
        if (status == STATUS_SYNCING) {
            editor.putLong("sync_started_at", System.currentTimeMillis())
        }
        editor.apply()
    }

    /**
     * The persisted status with one repair applied: a process kill mid-sync
     * leaves "syncing" behind with no transition out, so an entry whose sync
     * started long ago is reported as an error instead of hanging forever.
     */
    fun effectiveStatus(): String {
        val status = prefs.getString("sync_status", STATUS_IDLE) ?: STATUS_IDLE
        if (status != STATUS_SYNCING) return status
        val startedAt = prefs.getLong("sync_started_at", 0L)
        val fresh = System.currentTimeMillis() - startedAt < SYNCING_STALE_MS
        return if (fresh) STATUS_SYNCING else STATUS_ERROR
    }

    /** Sync could not run at all (unauthenticated/unconfigured) — not an error. */
    private fun notRunResult(): Map<String, Any?> {
        setStatus(STATUS_IDLE)
        return statusSnapshot()
    }

    private suspend fun fetchMergePush(
        api: GithubApiClient,
        owner: String,
        repo: String,
        branch: String,
    ): Map<String, Any?> {
        val cyclesFile = api.getFileContent(owner, repo, "ritulaya-cycles.csv", branch)
        val remoteCycles = if (cyclesFile != null) CsvHandler.parseCycles(cyclesFile.content) else emptyList()

        val logsFile = api.getFileContent(owner, repo, "ritulaya-day-logs.csv", branch)
        val remoteLogs = if (logsFile != null) CsvHandler.parseDayLogs(logsFile.content) else emptyList()

        val settingsFile = api.getFileContent(owner, repo, "ritulaya-settings.json", branch)
        val remoteSettings = settingsFile?.let { parseSettings(it.content) }

        val manifestFile = api.getFileContent(owner, repo, "ritulaya.json", branch)

        val localCycles = loadCycles()
        val localLogs = loadDayLogs()
        val localSettings = loadSettings()
        // Captured with the snapshot: only these tombstones are cleared after
        // a successful sync, so deletions made mid-sync survive to be pushed.
        val snapshotTombstones = dataStore.listTombstones()

        val mergedCycles = MergeEngine.mergeCycles(localCycles, remoteCycles)
        val mergedLogs = MergeEngine.mergeDayLogs(localLogs, remoteLogs)
        val mergedSettings = mergeSettings(localSettings, remoteSettings)

        val cyclesCsv = CsvHandler.writeCycles(mergedCycles)
        val logsCsv = CsvHandler.writeDayLogs(mergedLogs)
        val manifest = SyncManifest.write(appVersion())

        val message = "Sync: ritulaya data update"

        api.updateOrCreateFile(
            owner,
            repo,
            "ritulaya-cycles.csv",
            cyclesCsv,
            cyclesFile?.sha,
            branch,
            message,
        )
        api.updateOrCreateFile(
            owner,
            repo,
            "ritulaya-day-logs.csv",
            logsCsv,
            logsFile?.sha,
            branch,
            message,
        )
        if (mergedSettings != null) {
            api.updateOrCreateFile(
                owner,
                repo,
                "ritulaya-settings.json",
                writeSettings(mergedSettings),
                settingsFile?.sha,
                branch,
                message,
            )
        }
        if (manifestFile == null) {
            api.updateOrCreateFile(
                owner,
                repo,
                "ritulaya.json",
                manifest,
                null,
                branch,
                "Sync: add manifest",
            )
        }

        persist(
            MergeInputs(
                mergedCycles = mergedCycles,
                mergedLogs = mergedLogs,
                localCycles = localCycles,
                localLogs = localLogs,
                remoteCycles = remoteCycles,
                remoteLogs = remoteLogs,
                snapshotTombstones = snapshotTombstones,
            ),
        )
        mergedSettings?.let { persistSettings(it) }

        prefs
            .edit()
            .putLong("last_sync_at", System.currentTimeMillis())
            .putInt("consecutive_failures", 0)
            .putBoolean("sync_warning", false)
            .putString("sync_status", STATUS_IN_SYNC)
            .apply()

        return mapOf(
            "status" to STATUS_IN_SYNC,
            "syncedAt" to System.currentTimeMillis().toString(),
        )
    }

    private suspend fun loadCycles(): List<CycleRow> =
        dataStore.listCyclesIncludingTombstones().map { row ->
            val deletedAt = row.deletedAt
            if (deletedAt != null) {
                CycleRow(row.id, "", null, "", deletedAt, deletedAt)
            } else {
                val entity = requireNotNull(row.value)
                CycleRow(entity.id, entity.startDate, entity.endDate, entity.createdAt, entity.updatedAt, null)
            }
        }

    private suspend fun loadDayLogs(): List<DayLogRow> =
        dataStore.listDayLogsIncludingTombstones().map { row ->
            val deletedAt = row.deletedAt
            if (deletedAt != null) {
                DayLogRow(row.id, "", null, null, "[]", null, null, null, null, 0, "", deletedAt, deletedAt)
            } else {
                val entity = requireNotNull(row.value)
                DayLogRow(
                    entity.id,
                    entity.date,
                    entity.cycleId,
                    entity.flowIntensity,
                    entity.symptoms,
                    entity.mood,
                    entity.notes,
                    entity.cervicalMucus,
                    entity.bbt,
                    entity.sexualActivity,
                    entity.createdAt,
                    entity.updatedAt,
                    null,
                )
            }
        }

    private suspend fun loadSettings(): SettingsEntity? = dataStore.getSettings()

    /** Everything captured when the sync's merge inputs were read. */
    private data class MergeInputs(
        val mergedCycles: List<CycleRow>,
        val mergedLogs: List<DayLogRow>,
        val localCycles: List<CycleRow>,
        val localLogs: List<DayLogRow>,
        val remoteCycles: List<CycleRow>,
        val remoteLogs: List<DayLogRow>,
        val snapshotTombstones: List<SyncTombstoneEntity>,
    )

    private suspend fun persist(inputs: MergeInputs) {
        val cycleEntities =
            inputs.mergedCycles
                .filter { it.deletedAt == null }
                .map { CycleEntity(it.id, it.startDate, it.endDate, it.createdAt, it.updatedAt) }
        val logEntities =
            inputs.mergedLogs
                .filter { it.deletedAt == null }
                .map {
                    DayLogEntity(
                        it.id,
                        it.date,
                        it.cycleId,
                        it.flowIntensity,
                        it.symptoms,
                        it.mood,
                        it.notes,
                        it.cervicalMucus,
                        it.bbt,
                        it.sexualActivity,
                        it.createdAt,
                        it.updatedAt,
                    )
                }

        // Rows known on either side that did not survive the merge were deleted;
        // everything else is upserted in place so writes made during the sync
        // (after the initial read) are preserved. Each deletion carries its
        // timestamp so applyMerge can spare a live row edited after the delete.
        val deletedCycles =
            deletionTimestamps(
                inputs.localCycles.map { it.id to it.deletedAt } +
                    inputs.remoteCycles.map { it.id to it.deletedAt },
            )
        val deletedDayLogs =
            deletionTimestamps(
                inputs.localLogs.map { it.id to it.deletedAt } +
                    inputs.remoteLogs.map { it.id to it.deletedAt },
            )
        val liveCycleIds = cycleEntities.map { it.id }.toSet()
        val liveLogIds = logEntities.map { it.id }.toSet()
        val deletedCycleIds = deletedCycles.filterKeys { it !in liveCycleIds }
        val deletedDayLogIds = deletedDayLogs.filterKeys { it !in liveLogIds }

        dataStore.applyMerge(
            cycleEntities,
            logEntities,
            deletedCycleIds,
            deletedDayLogIds,
            inputs.snapshotTombstones,
        )
    }

    /** Newest tombstone per row id across both sides; ISO strings compare chronologically. */
    private fun deletionTimestamps(rows: List<Pair<String, String?>>): MutableMap<String, String> {
        val deletions = mutableMapOf<String, String>()
        rows.forEach { (id, deletedAt) ->
            if (deletedAt == null) return@forEach
            val existing = deletions[id]
            if (existing == null || deletedAt > existing) deletions[id] = deletedAt
        }
        return deletions
    }

    private suspend fun persistSettings(settings: SettingsEntity) {
        val existing = dataStore.getSettings()
        dataStore.saveSettings(settings.copy(createdAt = existing?.createdAt ?: settings.updatedAt))
    }

    private fun mergeSettings(
        local: SettingsEntity?,
        remote: SettingsEntity?,
    ): SettingsEntity? {
        if (local == null) return remote
        if (remote == null) return local
        return if (remote.updatedAt >= local.updatedAt) remote else local
    }

    private fun parseSettings(json: String): SettingsEntity? =
        try {
            val o = org.json.JSONObject(json)
            SettingsEntity(
                id = "default",
                avgCycleLength = o.optInt("avgCycleLength", 28),
                avgPeriodLength = o.optInt("avgPeriodLength", 3),
                lutealPhaseLength = o.optInt("lutealPhaseLength", 14),
                theme = o.optString("theme", "system"),
                language = o.optString("language", "en"),
                biometricLock = o.optInt("biometricLock", 0),
                discreetMode = o.optInt("discreetMode", 0),
                reminderPeriodAhead = o.optInt("reminderPeriodAhead", 2),
                reminderDailyLog = o.optInt("reminderDailyLog", 0),
                createdAt = "",
                updatedAt = o.optString("updatedAt", ""),
            )
        } catch (e: Exception) {
            null
        }

    private fun writeSettings(settings: SettingsEntity): String =
        org.json
            .JSONObject()
            .apply {
                put("avgCycleLength", settings.avgCycleLength)
                put("avgPeriodLength", settings.avgPeriodLength)
                put("lutealPhaseLength", settings.lutealPhaseLength)
                put("theme", settings.theme)
                put("language", settings.language)
                put("biometricLock", settings.biometricLock)
                put("discreetMode", settings.discreetMode)
                put("reminderPeriodAhead", settings.reminderPeriodAhead)
                put("reminderDailyLog", settings.reminderDailyLog)
                put("updatedAt", settings.updatedAt)
            }.toString()

    private fun appVersion(): String =
        try {
            appContext.packageManager.getPackageInfo(appContext.packageName, 0).versionName ?: "0.1.0"
        } catch (e: Exception) {
            "0.1.0"
        }

    fun statusSnapshot(): Map<String, Any?> {
        val syncedAt = prefs.getLong("last_sync_at", 0L)
        return mapOf(
            "status" to effectiveStatus(),
            "syncedAt" to if (syncedAt > 0) syncedAt.toString() else null,
            "warning" to prefs.getBoolean("sync_warning", false),
            "consecutiveFailures" to prefs.getInt("consecutive_failures", 0),
        )
    }
}
