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

    suspend fun upsertDayLog(input: Map<String, Any?>): DayLogEntity {
        val now = nowISO()
        val date = input["date"] as? String ?: throw IllegalArgumentException("date is required")
        val existing = dao.getDayLogByDate(date)
        val symptomsJson = symptomsJson(input["symptoms"] as? List<*>)

        if (existing != null) {
            val updated =
                existing.copy(
                    flowIntensity = input["flowIntensity"] as? String ?: existing.flowIntensity,
                    symptoms = symptomsJson,
                    mood = input["mood"] as? String ?: existing.mood,
                    notes = input["notes"] as? String ?: existing.notes,
                    cervicalMucus = input["cervicalMucus"] as? String ?: existing.cervicalMucus,
                    bbt = (input["bbt"] as? Number)?.toDouble() ?: existing.bbt,
                    sexualActivity = sexualActivityValue(input["sexualActivity"], existing.sexualActivity),
                    cycleId = input["cycleId"] as? String ?: existing.cycleId,
                    updatedAt = now,
                )
            dao.upsertDayLog(updated)
            return updated
        }

        val log =
            DayLogEntity(
                id = generateId(),
                date = date,
                cycleId = input["cycleId"] as? String,
                flowIntensity = input["flowIntensity"] as? String,
                symptoms = symptomsJson,
                mood = input["mood"] as? String,
                notes = input["notes"] as? String,
                cervicalMucus = input["cervicalMucus"] as? String,
                bbt = (input["bbt"] as? Number)?.toDouble(),
                sexualActivity = sexualActivityValue(input["sexualActivity"], 0),
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

    suspend fun updateSettings(patch: Map<String, Any?>) {
        val existing = dao.getSettings()
        val base =
            existing
                ?: SettingsEntity(
                    id = "default",
                    createdAt = patch["createdAt"] as? String ?: nowISO(),
                    updatedAt = nowISO(),
                )
        val merged =
            base.copy(
                avgCycleLength = (patch["avgCycleLength"] as? Number)?.toInt() ?: base.avgCycleLength,
                avgPeriodLength = (patch["avgPeriodLength"] as? Number)?.toInt() ?: base.avgPeriodLength,
                lutealPhaseLength = (patch["lutealPhaseLength"] as? Number)?.toInt() ?: base.lutealPhaseLength,
                theme = patch["theme"] as? String ?: base.theme,
                language = patch["language"] as? String ?: base.language,
                biometricLock = (patch["biometricLock"] as? Number)?.toInt() ?: base.biometricLock,
                discreetMode = (patch["discreetMode"] as? Number)?.toInt() ?: base.discreetMode,
                reminderPeriodAhead = (patch["reminderPeriodAhead"] as? Number)?.toInt() ?: base.reminderPeriodAhead,
                reminderDailyLog = (patch["reminderDailyLog"] as? Number)?.toInt() ?: base.reminderDailyLog,
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

    private fun symptomsJson(symptoms: List<*>?): String {
        if (symptoms.isNullOrEmpty()) return "[]"
        return org.json.JSONArray(symptoms.mapNotNull { it?.toString() }).toString()
    }

    private fun sexualActivityValue(
        value: Any?,
        fallback: Int,
    ): Int =
        when (value) {
            is Boolean -> if (value) 1 else fallback
            is Number -> if (value.toInt() > 0) 1 else fallback
            else -> fallback
        }

    companion object {
        private val ID_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789"
        private val ISO_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")

        fun generateId(): String = "${System.currentTimeMillis()}-${(1..8).map { ID_CHARS.random() }.joinToString("")}"

        fun nowISO(): String = Instant.now().atOffset(ZoneOffset.UTC).format(ISO_FORMATTER)
    }
}
