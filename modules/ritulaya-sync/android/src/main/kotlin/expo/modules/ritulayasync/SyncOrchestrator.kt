package expo.modules.ritulayasync

import android.content.Context
import android.content.SharedPreferences

class SyncOrchestrator(
    private val appContext: Context,
    private val prefs: SharedPreferences,
) {
    private val tokenStore = SecureTokenStore(appContext)
    private val localData = LocalDataStore(appContext)

    fun sync(): Map<String, Any> {
        val token = tokenStore.load("github_token")
        if (token == null) return errorResult("Not authenticated")

        val owner = prefs.getString("repo_owner", null)
        if (owner == null) return errorResult("Repo not configured")
        val repo = prefs.getString("repo_name", null)
        if (repo == null) return errorResult("Repo not configured")
        val branch = prefs.getString("repo_branch", "main")!!

        val api = GithubApiClient(token)

        return try {
            fetchMergePush(api, owner, repo, branch)
        } catch (e: Exception) {
            val failures = prefs.getInt("consecutive_failures", 0) + 1
            prefs.edit().putInt("consecutive_failures", failures).apply()
            if (failures >= 3) {
                prefs.edit().putBoolean("sync_warning", true).apply()
            }
            errorResult(e.message ?: "Sync failed")
        }
    }

    private fun fetchMergePush(
        api: GithubApiClient,
        owner: String,
        repo: String,
        branch: String,
    ): Map<String, Any> {
        val cyclesFile = api.getFileContent(owner, repo, "ritulaya-cycles.csv", branch)
        val remoteCycles = if (cyclesFile != null) CsvHandler.parseCycles(cyclesFile.content) else emptyList()

        val logsFile = api.getFileContent(owner, repo, "ritulaya-day-logs.csv", branch)
        val remoteLogs = if (logsFile != null) CsvHandler.parseDayLogs(logsFile.content) else emptyList()

        val settingsFile = api.getFileContent(owner, repo, "ritulaya-settings.json", branch)
        val remoteSettings = settingsFile?.let { parseSettings(it.content) }

        val manifestFile = api.getFileContent(owner, repo, "ritulaya.json", branch)

        val localCycles = localData.loadCycles()
        val localLogs = localData.loadDayLogs()
        val localSettings = localData.loadSettings()

        val mergedCycles = MergeEngine.mergeCycles(localCycles, remoteCycles)
        val mergedLogs = MergeEngine.mergeDayLogs(localLogs, remoteLogs)
        val mergedSettings = mergeSettings(localSettings, remoteSettings)

        val cyclesCsv = CsvHandler.writeCycles(mergedCycles)
        val logsCsv = CsvHandler.writeDayLogs(mergedLogs)
        val manifest = SyncManifest.write()

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

        localData.persist(mergedCycles, mergedLogs)
        mergedSettings?.let { localData.persistSettings(it) }

        prefs
            .edit()
            .putLong("last_sync_at", System.currentTimeMillis())
            .putInt("consecutive_failures", 0)
            .putBoolean("sync_warning", false)
            .apply()

        return mapOf(
            "status" to "inSync",
            "syncedAt" to System.currentTimeMillis().toString(),
        )
    }

    private fun mergeSettings(
        local: SettingsRow?,
        remote: SettingsRow?,
    ): SettingsRow? {
        if (local == null) return remote
        if (remote == null) return local
        return if (remote.updatedAt >= local.updatedAt) remote else local
    }

    private fun parseSettings(json: String): SettingsRow? =
        try {
            val o = org.json.JSONObject(json)
            SettingsRow(
                avgCycleLength = o.optInt("avgCycleLength", 28),
                avgPeriodLength = o.optInt("avgPeriodLength", 3),
                lutealPhaseLength = o.optInt("lutealPhaseLength", 14),
                theme = o.optString("theme", "system"),
                language = o.optString("language", "en"),
                biometricLock = o.optInt("biometricLock", 0),
                discreetMode = o.optInt("discreetMode", 0),
                reminderPeriodAhead = o.optInt("reminderPeriodAhead", 2),
                reminderDailyLog = o.optInt("reminderDailyLog", 0),
                updatedAt = o.optString("updatedAt", ""),
            )
        } catch (e: Exception) {
            null
        }

    private fun writeSettings(settings: SettingsRow): String =
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

    private fun errorResult(message: String): Map<String, Any> =
        mapOf(
            "status" to "error",
            "syncedAt" to (prefs.getLong("last_sync_at", 0L).toString()),
            "warning" to prefs.getBoolean("sync_warning", false),
            "consecutiveFailures" to prefs.getInt("consecutive_failures", 0),
        )
}
