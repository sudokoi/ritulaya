package expo.modules.ritulayadb

import android.content.Context
import androidx.room.withTransaction
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

class RitulayaDataStore(
    context: Context,
) {
    private val db = RitulayaDatabase.getInstance(context.applicationContext)
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
        writeDayLog(
            date = input.date,
            cycleId = input.cycleId,
            flowIntensity = input.flowIntensity,
            symptoms = input.symptoms,
            mood = input.mood,
            notes = input.notes,
            cervicalMucus = input.cervicalMucus,
            bbt = input.bbt,
            sexualActivity = input.sexualActivity,
        )

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
                    flowIntensity = flow,
                    symptoms = emptyList(),
                    mood = null,
                    notes = null,
                    cervicalMucus = null,
                    bbt = null,
                    sexualActivity = null,
                )
            }
        }
    }

    private suspend fun writeDayLog(
        date: String,
        cycleId: String?,
        flowIntensity: String?,
        symptoms: List<String>?,
        mood: String?,
        notes: String?,
        cervicalMucus: String?,
        bbt: Double?,
        sexualActivity: Boolean?,
    ): DayLogEntity {
        val now = nowISO()
        val existing = dao.getDayLogByDate(date)
        val symptomsJson = symptomsJson(symptoms)

        if (existing != null) {
            val updated =
                existing.copy(
                    flowIntensity = flowIntensity ?: existing.flowIntensity,
                    symptoms = symptomsJson,
                    mood = mood ?: existing.mood,
                    notes = notes ?: existing.notes,
                    cervicalMucus = cervicalMucus ?: existing.cervicalMucus,
                    bbt = bbt ?: existing.bbt,
                    sexualActivity = sexualActivity?.let { if (it) 1 else 0 } ?: existing.sexualActivity,
                    cycleId = cycleId ?: existing.cycleId,
                    updatedAt = now,
                )
            dao.upsertDayLog(updated)
            return updated
        }

        val log =
            DayLogEntity(
                id = generateId(),
                date = date,
                cycleId = cycleId,
                flowIntensity = flowIntensity,
                symptoms = symptomsJson,
                mood = mood,
                notes = notes,
                cervicalMucus = cervicalMucus,
                bbt = bbt,
                sexualActivity = if (sexualActivity == true) 1 else 0,
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
     * deletions are pushed on a later sync.
     */
    suspend fun applyMerge(
        cycles: List<CycleEntity>,
        dayLogs: List<DayLogEntity>,
        deletedCycleIds: Set<String>,
        deletedDayLogIds: Set<String>,
        snapshotTombstones: List<SyncTombstoneEntity>,
    ) {
        db.withTransaction {
            // Last-write-wins against live rows so a local edit made while the
            // sync was running is not clobbered by a snapshot-era merged row.
            cycles.forEach { incoming ->
                val live = dao.getCycleById(incoming.id)
                if (live == null || incoming.updatedAt >= live.updatedAt) {
                    dao.insertCycle(incoming)
                }
            }
            dayLogs.forEach { incoming ->
                val live = dao.getDayLogById(incoming.id)
                if (live == null || incoming.updatedAt >= live.updatedAt) {
                    dao.upsertDayLog(incoming)
                }
            }
            deletedCycleIds.forEach { dao.deleteCycleById(it) }
            deletedDayLogIds.forEach { dao.deleteDayLogById(it) }
            snapshotTombstones.forEach {
                dao.deleteTombstone(entity = it.entity, entityId = it.entityId)
            }
        }
    }

    private fun symptomsJson(symptoms: List<String>?): String {
        if (symptoms.isNullOrEmpty()) return "[]"
        return org.json.JSONArray(symptoms).toString()
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
