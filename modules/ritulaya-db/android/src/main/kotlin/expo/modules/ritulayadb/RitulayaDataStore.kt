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

    suspend fun upsertDayLog(input: DayLogInput): DayLogEntity = writeDayLog(date = input.date, cycleId = input.cycleId, input = input)

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

    suspend fun deleteDayLog(id: String) {
        dao.deleteDayLogById(id)
        dao.insertTombstone(
            SyncTombstoneEntity(entity = "day_log", entityId = id, deletedAt = nowISO()),
        )
    }

    suspend fun getSettings(): SettingsEntity? = dao.getSettings()

    suspend fun saveSettings(settings: SettingsEntity) {
        dao.upsertSettings(settings)
    }

    suspend fun updateSettings(patch: SettingsPatch) {
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
        dao.upsertSettings(merged)
    }

    suspend fun listTombstones(): List<SyncTombstoneEntity> = dao.listTombstones()

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
     * Applies a merged sync result without wiping rows written while the sync
     * was in flight: live rows are upserted, only rows that were deleted on
     * either side are removed, and only the tombstones captured when the sync
     * started are cleared — tombstones created mid-sync survive so their
     * deletions are pushed on a later sync. Deletion maps carry each row's
     * deletion timestamp; a live row edited after that timestamp survives,
     * mirroring the recency rule the merge applies to snapshot-era rows.
     */
    suspend fun applyMerge(
        cycles: List<CycleEntity>,
        dayLogs: List<DayLogEntity>,
        deletedCycles: Map<String, String>,
        deletedDayLogs: Map<String, String>,
        snapshotTombstones: List<SyncTombstoneEntity>,
    ) {
        db.withTransaction {
            // A deletion made while the sync was running (a tombstone newer
            // than the merged row) must not be resurrected by the upsert
            // pass — the merge only saw the pre-deletion snapshot.
            val tombstones =
                dao
                    .listTombstones()
                    .associateBy { "${it.entity}:${it.entityId}" }
                    .mapValues { it.value.deletedAt }
            // Last-write-wins against live rows so a local edit made while the
            // sync was running is not clobbered by a snapshot-era merged row.
            cycles.forEach { incoming ->
                if (isDeletedNewer(tombstones, "cycle", incoming.id, incoming.updatedAt)) return@forEach
                val live = dao.getCycleById(incoming.id)
                if (live == null || incoming.updatedAt >= live.updatedAt) {
                    dao.insertCycle(incoming)
                }
            }
            dayLogs.forEach { incoming ->
                if (isDeletedNewer(tombstones, "day_log", incoming.id, incoming.updatedAt)) return@forEach
                val live = dao.getDayLogById(incoming.id)
                if (live == null || incoming.updatedAt >= live.updatedAt) {
                    dao.upsertDayLog(incoming)
                }
            }
            deletedCycles.forEach { (id, deletedAt) ->
                val live = dao.getCycleById(id)
                if (live == null || !isEditedAfter(live.updatedAt, deletedAt)) {
                    dao.deleteCycleById(id)
                }
            }
            deletedDayLogs.forEach { (id, deletedAt) ->
                val live = dao.getDayLogById(id)
                if (live == null || !isEditedAfter(live.updatedAt, deletedAt)) {
                    dao.deleteDayLogById(id)
                }
            }
            snapshotTombstones.forEach {
                dao.deleteTombstone(entity = it.entity, entityId = it.entityId)
            }
        }
    }

    private fun isEditedAfter(
        updatedAt: String,
        deletedAt: String,
    ): Boolean =
        try {
            Instant.parse(updatedAt).toEpochMilli() > Instant.parse(deletedAt).toEpochMilli()
        } catch (e: Exception) {
            false
        }

    /** True when the row was deleted (mid-sync) at or after its incoming edit. */
    private fun isDeletedNewer(
        tombstones: Map<String, String>,
        entity: String,
        id: String,
        updatedAt: String,
    ): Boolean {
        val deletedAt = tombstones["$entity:$id"] ?: return false
        return !isEditedAfter(updatedAt, deletedAt)
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
