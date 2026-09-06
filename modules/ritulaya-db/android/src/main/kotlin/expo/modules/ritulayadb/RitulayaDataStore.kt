package expo.modules.ritulayadb

import android.content.Context
import androidx.room.withTransaction
import kotlinx.coroutines.sync.withLock
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

class RitulayaDataStore internal constructor(
    private val db: RitulayaDatabase,
    private val reminders: ReminderActions? = null,
) {
    constructor(
        context: Context,
    ) : this(RitulayaDatabase.getInstance(context.applicationContext), AndroidReminderActions(context.applicationContext))

    private val dao = db.dao()

    suspend fun listCycles(): List<CycleEntity> = dao.listCycles()

    suspend fun createCycle(startDate: String): CycleEntity {
        val now = nowISO()
        val cycle =
            CycleEntity(
                id = generateId(),
                startDate = startDate,
                endDate = null,
                createdAt = now,
                updatedAt = now,
            )
        dao.insertCycle(cycle)
        return cycle
    }

    suspend fun listDayLogs(): List<DayLogEntity> = dao.listDayLogs()

    suspend fun readAppSnapshot(): Map<String, Any?> =
        db.withTransaction {
            mapOf(
                "cycles" to dao.listCycles().map { it.toMap() },
                "logs" to dao.listDayLogs().map { it.toMap() },
                "settings" to dao.getSettings()?.toMap(),
                "dataVersion" to (latestDataChange() ?: ""),
            )
        }

    suspend fun upsertDayLog(input: DayLogInput): DayLogEntity =
        db.withTransaction {
            val before = dao.listDayLogs()
            writeDayLog(date = input.date, cycleId = input.cycleId, input = input)
            reconcileEntries(before)
            requireNotNull(dao.getDayLogByDate(input.date))
        }

    /** Decide the flow transition from persisted data and commit the whole command together. */
    suspend fun saveDayEntry(
        input: DayLogInput,
        periodDays: Int,
    ): DayLogEntity =
        db.withTransaction {
            val before = dao.listDayLogs()
            val existing = dao.getDayLogByDate(input.date)
            val flow = input.flowIntensity
            val isPeriod = flow != null && flow != "none"
            val wasPeriod = existing?.flowIntensity != null && existing.flowIntensity != "none"
            if (isPeriod && !wasPeriod) {
                fillPeriod(input.date, requireNotNull(flow), periodDays)
            }
            // Re-read after period fill so its chosen cycle association is preserved.
            writeDayLog(date = input.date, cycleId = input.cycleId, input = input)
            reconcileEntries(before)
            requireNotNull(dao.getDayLogByDate(input.date))
        }

    suspend fun logPeriod(
        flow: String,
        periodDays: Int,
    ) {
        logPeriodOn(LocalDate.now().toString(), flow, periodDays)
    }

    suspend fun logPeriodOn(
        date: String,
        flow: String,
        periodDays: Int,
    ) {
        db.withTransaction {
            val before = dao.listDayLogs()
            fillPeriod(date, flow, periodDays)
            reconcileEntries(before)
        }
    }

    private suspend fun fillPeriod(
        date: String,
        flow: String,
        periodDays: Int,
    ) {
        require(flow in setOf("spotting", "light", "medium", "heavy") && periodDays in 1..14) { "Invalid period input" }
        val start = LocalDate.parse(date)
        val previous = dao.getDayLogByDate(start.minusDays(1).toString())
        val count = if (previous?.flowIntensity != null && previous.flowIntensity != "none") 1 else periodDays
        repeat(count) { index ->
            writeDayLog(start.plusDays(index.toLong()).toString(), null, DayLogInput().apply { flowIntensity = flow })
        }
    }

    private suspend fun reconcileEntries(before: List<DayLogEntity>) {
        installReconciliation(CycleReconciliation.plan(dao.listCycles(), before, dao.listDayLogs()))
    }

    private suspend fun installReconciliation(plan: CycleReconciliation.Plan) {
        val cycles = dao.listCycles().associateBy { it.id }
        val logs = dao.listDayLogs().associateBy { it.id }
        for (removed in cycles.keys - plan.cycles.map { it.id }.toSet()) {
            dao.deleteCycleById(removed)
            dao.insertTombstone(SyncTombstoneEntity("cycle", removed, nowISO()))
        }
        plan.cycles.filter { cycles[it.id] != it }.forEach { dao.insertCycle(it) }
        plan.logs.filter { logs[it.id] != it }.forEach { dao.upsertDayLog(it) }
    }

    private suspend fun repairToken(): String =
        java.security.MessageDigest
            .getInstance("SHA-256")
            .digest(
                dao
                    .syncRevisions()
                    .sortedBy { it.key }
                    .joinToString("\n") { "${it.key}:${it.revision}" }
                    .toByteArray(),
            ).joinToString("") { "%02x".format(it) }

    suspend fun previewCycleRepair(): Map<String, Any> =
        db.withTransaction {
            val cycles = dao.listCycles()
            val logs = dao.listDayLogs()
            val plan = CycleReconciliation.plan(cycles, logs, logs, repair = true)
            mapOf(
                "token" to repairToken(),
                "before" to cycles.map { it.toMap() },
                "after" to plan.cycles.map { it.toMap() },
                "reassociatedEntries" to plan.logs.count { row -> logs.single { it.id == row.id }.cycleId != row.cycleId },
            )
        }

    suspend fun applyCycleRepair(token: String) =
        db.withTransaction {
            require(token == repairToken()) { "History changed; preview again before confirming" }
            val logs = dao.listDayLogs()
            installReconciliation(CycleReconciliation.plan(dao.listCycles(), logs, logs, repair = true))
        }

    private suspend fun writeDayLog(
        date: String,
        cycleId: String?,
        input: DayLogInput,
    ): DayLogEntity {
        val now = nowISO()
        val existing = dao.getDayLogByDate(date)
        val fields = resolveDayLogFields(input, existing)

        if (existing != null) {
            val updated =
                existing.copy(
                    flowIntensity = fields.flowIntensity,
                    symptoms = fields.symptomsJson,
                    mood = fields.mood,
                    notes = fields.notes,
                    cervicalMucus = fields.cervicalMucus,
                    bbt = fields.bbt,
                    sexualActivity = fields.sexualActivity,
                    cycleId = cycleId ?: fields.cycleId,
                    updatedAt = now,
                )
            dao.upsertDayLog(updated)
            return updated
        }

        val log =
            DayLogEntity(
                id = generateId(),
                date = date,
                cycleId = cycleId ?: fields.cycleId,
                flowIntensity = fields.flowIntensity,
                symptoms = fields.symptomsJson,
                mood = fields.mood,
                notes = fields.notes,
                cervicalMucus = fields.cervicalMucus,
                bbt = fields.bbt,
                sexualActivity = fields.sexualActivity,
                createdAt = now,
                updatedAt = now,
            )
        dao.upsertDayLog(log)
        return log
    }

    suspend fun deleteDayLog(id: String) =
        db.withTransaction {
            val before = dao.listDayLogs()
            dao.deleteDayLogById(id)
            dao.insertTombstone(
                SyncTombstoneEntity(entity = "day_log", entityId = id, deletedAt = nowISO()),
            )
            reconcileEntries(before)
        }

    suspend fun getSettings(): SettingsEntity? = dao.getSettings()

    suspend fun scheduleReminder(input: ReminderInput): Boolean =
        ReminderPublication.schedule(input, ::getSettings, requireNotNull(reminders))

    suspend fun updateSettings(patch: SettingsPatch) =
        ReminderPublication.mutex.withLock {
            db.withTransaction {
                val existing = dao.getSettings()
                val base =
                    existing
                        ?: SettingsEntity(
                            id = "default",
                            createdAt = patch.createdAt ?: nowISO(),
                            updatedAt = nowISO(),
                        )
                val merged =
                    base.copy(
                        avgCycleLength = patch.avgCycleLength ?: base.avgCycleLength,
                        avgPeriodLength = patch.avgPeriodLength ?: base.avgPeriodLength,
                        lutealPhaseLength = patch.lutealPhaseLength ?: base.lutealPhaseLength,
                        theme = patch.theme ?: base.theme,
                        language = patch.language ?: base.language,
                        biometricLock = patch.biometricLock ?: base.biometricLock,
                        discreetMode = patch.discreetMode ?: base.discreetMode,
                        reminderPeriodAhead = patch.reminderPeriodAhead ?: base.reminderPeriodAhead,
                        reminderDailyLog = patch.reminderDailyLog ?: base.reminderDailyLog,
                        updatedAt = nowISO(),
                    )
                if (ReminderPublication.policyChanged(existing, merged)) reminders?.clear()
                patch.biometricLock?.let { dao.upsertDevicePolicy(DevicePolicyEntity(biometricLock = it)) }
                if (existing == null || merged.copy(biometricLock = 0, updatedAt = base.updatedAt) != base.copy(biometricLock = 0)) {
                    dao.upsertSettings(merged.copy(biometricLock = 0))
                }
            }
        }

    suspend fun listTombstones(): List<SyncTombstoneEntity> = dao.listTombstones()

    data class SyncSnapshot(
        val cycles: List<SyncRow<CycleEntity>>,
        val dayLogs: List<SyncRow<DayLogEntity>>,
        val settings: SettingsEntity?,
        val tombstones: List<SyncTombstoneEntity>,
        val revisions: List<SyncRevisionEntity>,
    )

    suspend fun readSyncSnapshot(): SyncSnapshot =
        db.withTransaction {
            SyncSnapshot(
                listCyclesIncludingTombstones(),
                listDayLogsIncludingTombstones(),
                getSettings(),
                listTombstones(),
                dao.syncRevisions(),
            )
        }

    suspend fun syncCheckpoint(target: String): String? = dao.syncCheckpoint(target)?.state

    suspend fun saveSyncCheckpoint(
        target: String,
        state: String,
    ) = dao.saveSyncCheckpoint(SyncCheckpointEntity(target, state))

    /** Apply only captured revisions; later edits stay pending against the newly accepted baseline. */
    suspend fun completeSync(
        target: String,
        checkpoint: String,
        captured: Map<String, Long>,
        cycles: Map<String, CycleEntity?>,
        days: Map<String, DayLogEntity?>,
        settings: SettingsEntity?,
        capturedRecords: String? = null,
    ) = ReminderPublication.mutex.withLock {
        db.withTransaction {
            val live = dao.syncRevisions().associate { it.key to it.revision }
            // Cycles and their entry associations form one aggregate. Never install
            // half a remote snapshot around local edits made while it was uploading.
            val unchanged = live == captured
            cycles.forEach { (id, value) ->
                if (unchanged) {
                    if (value == null) dao.deleteCycleById(id) else dao.insertCycle(value)
                }
            }
            days.forEach { (date, value) ->
                if (unchanged) {
                    val current = dao.getDayLogByDate(date)
                    if (value == null) {
                        current?.let { dao.deleteDayLogById(it.id) }
                    } else {
                        var localId = current?.id
                        if (localId == null) {
                            do {
                                localId = generateId()
                            } while (dao.getDayLogById(localId) != null)
                        }
                        dao.upsertDayLog(value.copy(id = localId))
                    }
                }
            }
            if (settings != null && unchanged) {
                if (ReminderPublication.policyChanged(dao.getSettings(), settings)) reminders?.clear()
                dao.upsertSettings(settings.copy(biometricLock = 0))
            }
            for (revision in dao.syncRevisions()) {
                if (unchanged) dao.acknowledgeRevision(revision.key, revision.revision)
            }
            val journal =
                if (capturedRecords == null) {
                    checkpoint
                } else {
                    val capturedValues = org.json.JSONObject(capturedRecords)
                    val localBase = org.json.JSONObject()
                    if (!unchanged) {
                        capturedValues.keys().asSequence().forEach { key -> localBase.put(key, capturedValues.get(key)) }
                    }
                    org.json
                        .JSONObject(checkpoint)
                        .put("localBase", localBase)
                        .put("rebasePending", !unchanged)
                        .toString()
                }
            dao.saveSyncCheckpoint(SyncCheckpointEntity(target, journal))
        }
    }

    suspend fun listCyclesIncludingTombstones(): List<SyncRow<CycleEntity>> = mergeWithTombstones(dao.listCycles(), "cycle") { it.id }

    suspend fun listDayLogsIncludingTombstones(): List<SyncRow<DayLogEntity>> = mergeWithTombstones(dao.listDayLogs(), "day_log") { it.id }

    private suspend fun <T> mergeWithTombstones(
        rows: List<T>,
        entity: String,
        idOf: (T) -> String,
    ): List<SyncRow<T>> {
        val byId = rows.associateBy(idOf)
        val tombstones = dao.listTombstones().filter { it.entity == entity }.associateBy { it.entityId }
        val ids = byId.keys + tombstones.keys
        return ids.map { id -> SyncRow(id, byId[id], tombstones[id]?.deletedAt) }
    }

    /**
     * Newest updated_at across cycles and day logs, or null when both tables
     * are empty. Callers compare it against a previously recorded value to
     * detect data that changed outside their control.
     */
    suspend fun latestDataChange(): String? {
        val cycleUpdate = dao.latestCycleUpdate()
        val dayLogUpdate = dao.latestDayLogUpdate()
        return listOfNotNull(cycleUpdate, dayLogUpdate).maxOrNull()
    }

    companion object {
        private val ID_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789"
        private val ISO_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")

        fun generateId(): String = "${System.currentTimeMillis()}-${(1..8).map { ID_CHARS.random() }.joinToString("")}"

        fun nowISO(): String = Instant.now().atOffset(ZoneOffset.UTC).format(ISO_FORMATTER)
    }
}

data class SyncRow<T>(
    val id: String,
    val value: T?,
    val deletedAt: String?,
)
