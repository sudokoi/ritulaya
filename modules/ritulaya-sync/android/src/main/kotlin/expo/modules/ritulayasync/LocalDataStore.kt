package expo.modules.ritulayasync

import android.content.ContentValues
import android.content.Context
import expo.modules.ritulayacrypto.CryptoKeys
import expo.modules.ritulayasync.CsvHandler.CycleRow
import expo.modules.ritulayasync.CsvHandler.DayLogRow
import net.sqlcipher.database.SQLiteDatabase
import java.io.File

data class SettingsRow(
    val avgCycleLength: Int,
    val avgPeriodLength: Int,
    val lutealPhaseLength: Int,
    val theme: String,
    val language: String,
    val biometricLock: Int,
    val discreetMode: Int,
    val reminderPeriodAhead: Int,
    val reminderDailyLog: Int,
    val updatedAt: String,
)

class LocalDataStore(
    private val appContext: Context,
) {
    companion object {
        @Volatile
        private var cipherLoaded = false
    }

    private val dbFile: File
        get() = File(appContext.filesDir, "SQLite/ritulaya.db")

    private fun open(): SQLiteDatabase? {
        return try {
            if (!dbFile.exists()) return null
            if (!cipherLoaded) {
                synchronized(this) {
                    if (!cipherLoaded) {
                        SQLiteDatabase.loadLibs(appContext)
                        cipherLoaded = true
                    }
                }
            }
            val key = CryptoKeys.getDatabaseKey(appContext)
            SQLiteDatabase.openDatabase(dbFile.canonicalPath, key, null, SQLiteDatabase.OPEN_READWRITE)
        } catch (e: Exception) {
            null
        }
    }

    fun loadCycles(): List<CycleRow> {
        val db = open() ?: return emptyList()
        return try {
            val rows = linkedMapOf<String, CycleRow>()
            db
                .rawQuery("SELECT id, start_date, end_date, created_at, updated_at FROM cycles", null)
                .use { cursor ->
                    while (cursor.moveToNext()) {
                        val id = cursor.getString(0)
                        rows[id] =
                            CycleRow(
                                id = id,
                                startDate = cursor.getString(1),
                                endDate = cursor.getString(2),
                                createdAt = cursor.getString(3),
                                updatedAt = cursor.getString(4),
                                deletedAt = null,
                            )
                    }
                }
            db
                .rawQuery("SELECT entity_id, deleted_at FROM sync_tombstones WHERE entity = 'cycle'", null)
                .use { cursor ->
                    while (cursor.moveToNext()) {
                        val id = cursor.getString(0)
                        val deletedAt = cursor.getString(1)
                        rows[id] = CycleRow(id, "", null, "", deletedAt, deletedAt)
                    }
                }
            rows.values.toList()
        } catch (e: Exception) {
            emptyList()
        } finally {
            db.close()
        }
    }

    fun loadDayLogs(): List<DayLogRow> {
        val db = open() ?: return emptyList()
        return try {
            val rows = linkedMapOf<String, DayLogRow>()
            db
                .rawQuery(
                    "SELECT id, date, cycle_id, flow_intensity, symptoms, mood, notes, " +
                        "cervical_mucus, bbt, sexual_activity, created_at, updated_at FROM day_logs",
                    null,
                ).use { cursor ->
                    while (cursor.moveToNext()) {
                        val id = cursor.getString(0)
                        rows[id] =
                            DayLogRow(
                                id = id,
                                date = cursor.getString(1),
                                cycleId = cursor.getString(2),
                                flowIntensity = cursor.getString(3),
                                symptoms = cursor.getString(4) ?: "[]",
                                mood = cursor.getString(5),
                                notes = cursor.getString(6),
                                cervicalMucus = cursor.getString(7),
                                bbt = if (cursor.isNull(8)) null else cursor.getDouble(8),
                                sexualActivity = cursor.getInt(9),
                                createdAt = cursor.getString(10),
                                updatedAt = cursor.getString(11),
                                deletedAt = null,
                            )
                    }
                }
            db
                .rawQuery("SELECT entity_id, deleted_at FROM sync_tombstones WHERE entity = 'day_log'", null)
                .use { cursor ->
                    while (cursor.moveToNext()) {
                        val id = cursor.getString(0)
                        val deletedAt = cursor.getString(1)
                        rows[id] = DayLogRow(id, "", null, null, "[]", null, null, null, null, 0, "", deletedAt, deletedAt)
                    }
                }
            rows.values.toList()
        } catch (e: Exception) {
            emptyList()
        } finally {
            db.close()
        }
    }

    fun persist(
        cycles: List<CycleRow>,
        logs: List<DayLogRow>,
    ) {
        val db = open() ?: return
        try {
            db.beginTransaction()
            try {
                persistCycles(db, cycles)
                persistDayLogs(db, logs)
                db.delete("sync_tombstones", null, null)
                db.setTransactionSuccessful()
            } finally {
                db.endTransaction()
            }
        } catch (e: Exception) {
            // Persistence is best-effort; the remote push already succeeded.
        } finally {
            db.close()
        }
    }

    private fun persistCycles(
        db: SQLiteDatabase,
        merged: List<CycleRow>,
    ) {
        val mergedIds = merged.map { it.id }.toHashSet()
        val existing = mutableListOf<String>()
        db.rawQuery("SELECT id FROM cycles", null).use { cursor ->
            while (cursor.moveToNext()) existing.add(cursor.getString(0))
        }
        for (id in existing) {
            if (id !in mergedIds) db.delete("cycles", "id = ?", arrayOf(id))
        }
        for (row in merged) {
            if (row.deletedAt != null) {
                db.delete("cycles", "id = ?", arrayOf(row.id))
            } else {
                val values = ContentValues()
                values.put("id", row.id)
                values.put("start_date", row.startDate)
                putNullable(values, "end_date", row.endDate)
                values.put("created_at", row.createdAt)
                values.put("updated_at", row.updatedAt)
                upsert(db, "cycles", values, row.id)
            }
        }
    }

    private fun persistDayLogs(
        db: SQLiteDatabase,
        merged: List<DayLogRow>,
    ) {
        val mergedIds = merged.map { it.id }.toHashSet()
        val existing = mutableListOf<String>()
        db.rawQuery("SELECT id FROM day_logs", null).use { cursor ->
            while (cursor.moveToNext()) existing.add(cursor.getString(0))
        }
        for (id in existing) {
            if (id !in mergedIds) db.delete("day_logs", "id = ?", arrayOf(id))
        }
        for (row in merged) {
            if (row.deletedAt != null) {
                db.delete("day_logs", "id = ?", arrayOf(row.id))
            } else {
                val values = ContentValues()
                values.put("id", row.id)
                values.put("date", row.date)
                putNullable(values, "cycle_id", row.cycleId)
                putNullable(values, "flow_intensity", row.flowIntensity)
                values.put("symptoms", row.symptoms)
                putNullable(values, "mood", row.mood)
                putNullable(values, "notes", row.notes)
                putNullable(values, "cervical_mucus", row.cervicalMucus)
                if (row.bbt != null) values.put("bbt", row.bbt) else values.putNull("bbt")
                values.put("sexual_activity", row.sexualActivity)
                values.put("created_at", row.createdAt)
                values.put("updated_at", row.updatedAt)
                upsert(db, "day_logs", values, row.id)
            }
        }
    }

    private fun upsert(
        db: SQLiteDatabase,
        table: String,
        values: ContentValues,
        id: String,
    ) {
        if (db.update(table, values, "id = ?", arrayOf(id)) == 0) {
            db.insertWithOnConflict(table, null, values, SQLiteDatabase.CONFLICT_IGNORE)
        }
    }

    private fun putNullable(
        values: ContentValues,
        key: String,
        value: String?,
    ) {
        if (value != null) values.put(key, value) else values.putNull(key)
    }

    fun loadSettings(): SettingsRow? {
        val db = open() ?: return null
        return try {
            db
                .rawQuery(
                    "SELECT avg_cycle_length, avg_period_length, luteal_phase_length, theme, " +
                        "language, biometric_lock, discreet_mode, reminder_period_ahead, " +
                        "reminder_daily_log, updated_at FROM settings WHERE id = 'default'",
                    null,
                ).use { cursor ->
                    if (cursor.moveToFirst()) {
                        SettingsRow(
                            avgCycleLength = cursor.getInt(0),
                            avgPeriodLength = cursor.getInt(1),
                            lutealPhaseLength = cursor.getInt(2),
                            theme = cursor.getString(3) ?: "system",
                            language = cursor.getString(4) ?: "en",
                            biometricLock = cursor.getInt(5),
                            discreetMode = cursor.getInt(6),
                            reminderPeriodAhead = cursor.getInt(7),
                            reminderDailyLog = cursor.getInt(8),
                            updatedAt = cursor.getString(9) ?: "",
                        )
                    } else {
                        null
                    }
                }
        } catch (e: Exception) {
            null
        } finally {
            db.close()
        }
    }

    fun persistSettings(settings: SettingsRow) {
        val db = open() ?: return
        try {
            val values = ContentValues()
            values.put("avg_cycle_length", settings.avgCycleLength)
            values.put("avg_period_length", settings.avgPeriodLength)
            values.put("luteal_phase_length", settings.lutealPhaseLength)
            values.put("theme", settings.theme)
            values.put("language", settings.language)
            values.put("biometric_lock", settings.biometricLock)
            values.put("discreet_mode", settings.discreetMode)
            values.put("reminder_period_ahead", settings.reminderPeriodAhead)
            values.put("reminder_daily_log", settings.reminderDailyLog)
            values.put("updated_at", settings.updatedAt)

            if (db.update("settings", values, "id = ?", arrayOf("default")) == 0) {
                values.put("id", "default")
                values.put("created_at", settings.updatedAt)
                db.insertWithOnConflict("settings", null, values, SQLiteDatabase.CONFLICT_IGNORE)
            }
        } catch (e: Exception) {
            // best-effort
        } finally {
            db.close()
        }
    }
}
