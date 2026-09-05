package expo.modules.ritulayadb

import android.content.Context
import androidx.room.withTransaction
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

class RitulayaDataStore internal constructor(
    private val db: RitulayaDatabase,
) {
    constructor(context: Context) : this(RitulayaDatabase.getInstance(context.applicationContext))

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

    suspend fun upsertDayLog(input: DayLogInput): DayLogEntity =
        db.withTransaction {
            writeDayLog(date = input.date, cycleId = input.cycleId, input = input)
        }

    /** Decide the flow transition from persisted data and commit the whole command together. */
    suspend fun saveDayEntry(
        input: DayLogInput,
        periodDays: Int,
    ): DayLogEntity =
        db.withTransaction {
            val existing = dao.getDayLogByDate(input.date)
            val flow = input.flowIntensity
            val isPeriod = flow != null && flow != "none"
            val wasPeriod = existing?.flowIntensity != null && existing.flowIntensity != "none"
            if (isPeriod && !wasPeriod) {
                logPeriodOn(input.date, requireNotNull(flow), periodDays)
            }
            // Re-read after period fill so its chosen cycle association is preserved.
            writeDayLog(date = input.date, cycleId = input.cycleId, input = input)
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
        val start = LocalDate.parse(date)
        db.withTransaction {
            val cycles = dao.listCycles().sortedBy { it.startDate }
            val startDates = cycles.map { it.startDate }
            val prevFlowDate = dao.findFlowDateBefore(date)
            val placement = CyclePlanner.place(startDates, date, prevFlowDate)

            val cycleId: String =
                when (placement) {
                    is CyclePlanner.Placement.Extend -> {
                        cycles.firstOrNull { it.startDate == placement.cycleStartDate }?.id
                            ?: createCycle(date).id
                    }

                    is CyclePlanner.Placement.New -> {
                        val newCycle = createCycle(date)
                        placement.predecessorStartDate?.let { predStart ->
                            val predecessor = cycles.first { it.startDate == predStart }
                            dao.updateCycleEndDate(
                                predecessor.id,
                                start.minusDays(1).toString(),
                                nowISO(),
                            )
                        }
                        placement.successorStartDate?.let { succStart ->
                            dao.updateCycleEndDate(
                                newCycle.id,
                                LocalDate.parse(succStart).minusDays(1).toString(),
                                nowISO(),
                            )
                        }
                        newCycle.id
                    }
                }

            val previousDayLog = dao.getDayLogByDate(start.minusDays(1).toString())
            val previousIsPeriod =
                previousDayLog?.flowIntensity != null && previousDayLog.flowIntensity != "none"
            val fillCount = if (previousIsPeriod) 1 else periodDays

            for (i in 0 until fillCount) {
                writeDayLog(
                    date = start.plusDays(i.toLong()).toString(),
                    cycleId = cycleId,
                    input =
                        DayLogInput().apply {
                            flowIntensity = flow
                        },
                )
            }
        }
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
            dao.deleteDayLogById(id)
            dao.insertTombstone(
                SyncTombstoneEntity(entity = "day_log", entityId = id, deletedAt = nowISO()),
            )
        }

    suspend fun getSettings(): SettingsEntity? = dao.getSettings()

    suspend fun updateSettings(patch: SettingsPatch) =
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
            patch.biometricLock?.let { dao.upsertDevicePolicy(DevicePolicyEntity(biometricLock = it)) }
            if (existing == null || merged.copy(biometricLock = 0, updatedAt = base.updatedAt) != base.copy(biometricLock = 0)) {
                dao.upsertSettings(merged.copy(biometricLock = 0))
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
    ) = db.withTransaction {
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
