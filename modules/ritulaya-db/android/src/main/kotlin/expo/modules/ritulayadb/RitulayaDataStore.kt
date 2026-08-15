package expo.modules.ritulayadb

import android.content.Context
import androidx.room.withTransaction
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

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
            var cycle = dao.listCycles().firstOrNull { it.endDate == null }

            if (cycle != null) {
                val lastFlowDate = dao.findLastFlowDate()
                if (lastFlowDate != null && ChronoUnit.DAYS.between(LocalDate.parse(lastFlowDate), start) >= NEW_CYCLE_GAP_DAYS) {
                    dao.updateCycleEndDate(cycle.id, start.minusDays(1).toString(), nowISO())
                    cycle = createCycle(date)
                }
            } else {
                cycle = createCycle(date)
            }

            val cycleId = cycle?.id
            if (cycleId != null) {
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
                    sexualActivity = if (sexualActivity == true) 1 else existing.sexualActivity,
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

    suspend fun replaceAll(
        cycles: List<CycleEntity>,
        dayLogs: List<DayLogEntity>,
    ) {
        db.withTransaction {
            dao.deleteAllCycles()
            dao.deleteAllDayLogs()
            cycles.forEach { dao.insertCycle(it) }
            dayLogs.forEach { dao.upsertDayLog(it) }
            dao.clearTombstones()
        }
    }

    private fun symptomsJson(symptoms: List<String>?): String {
        if (symptoms.isNullOrEmpty()) return "[]"
        return org.json.JSONArray(symptoms).toString()
    }

    companion object {
        private const val NEW_CYCLE_GAP_DAYS = 7
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
