package expo.modules.ritulayadb

import android.content.Context
import androidx.room.withTransaction
import java.time.Instant
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

    suspend fun endCycle(
        id: String,
        endDate: String,
    ) {
        dao.updateCycleEndDate(id, endDate, nowISO())
    }

    suspend fun listDayLogs(): List<DayLogEntity> = dao.listDayLogs()

    suspend fun findLastFlowDate(): String? = dao.findLastFlowDate()

    suspend fun upsertDayLog(input: DayLogInput): DayLogEntity {
        val now = nowISO()
        val existing = dao.getDayLogByDate(input.date)
        val symptomsJson = symptomsJson(input.symptoms)

        if (existing != null) {
            val updated =
                existing.copy(
                    flowIntensity = input.flowIntensity ?: existing.flowIntensity,
                    symptoms = symptomsJson,
                    mood = input.mood ?: existing.mood,
                    notes = input.notes ?: existing.notes,
                    cervicalMucus = input.cervicalMucus ?: existing.cervicalMucus,
                    bbt = input.bbt ?: existing.bbt,
                    sexualActivity = if (input.sexualActivity == true) 1 else existing.sexualActivity,
                    cycleId = input.cycleId ?: existing.cycleId,
                    updatedAt = now,
                )
            dao.upsertDayLog(updated)
            return updated
        }

        val log =
            DayLogEntity(
                id = generateId(),
                date = input.date,
                cycleId = input.cycleId,
                flowIntensity = input.flowIntensity,
                symptoms = symptomsJson,
                mood = input.mood,
                notes = input.notes,
                cervicalMucus = input.cervicalMucus,
                bbt = input.bbt,
                sexualActivity = if (input.sexualActivity == true) 1 else 0,
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
        private val ID_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789"
        private val ISO_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")

        fun generateId(): String = "${System.currentTimeMillis()}-${(1..8).map { ID_CHARS.random() }.joinToString("")}"

        fun nowISO(): String = Instant.now().atOffset(ZoneOffset.UTC).format(ISO_FORMATTER)
    }
}
