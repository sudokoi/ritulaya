package expo.modules.ritulayadb

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Entity(tableName = "sync_revisions")
data class SyncRevisionEntity(
    @PrimaryKey val key: String,
    val revision: Long,
    val pending: Boolean,
    val deleted: Boolean,
)

@Entity(tableName = "sync_checkpoints")
data class SyncCheckpointEntity(
    @PrimaryKey val target: String,
    val state: String,
)

@Entity(tableName = "device_policy")
data class DevicePolicyEntity(
    @PrimaryKey val id: String = "default",
    val biometricLock: Int = 0,
)

/** These triggers are part of our mutation contract, including writes made by native workers. */
object SyncSchema {
    val migration =
        object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    "CREATE TABLE sync_revisions (`key` TEXT NOT NULL PRIMARY KEY, revision INTEGER NOT NULL, pending INTEGER NOT NULL, deleted INTEGER NOT NULL)",
                )
                db.execSQL("CREATE TABLE sync_checkpoints (target TEXT NOT NULL PRIMARY KEY, state TEXT NOT NULL)")
                db.execSQL("CREATE TABLE device_policy (id TEXT NOT NULL PRIMARY KEY, biometricLock INTEGER NOT NULL)")
                db.execSQL("INSERT INTO device_policy SELECT id, biometric_lock FROM settings")
                db.execSQL("UPDATE settings SET biometric_lock = 0")
                for ((table, prefix, column) in listOf(
                    Triple("cycles", "cycle:", "id"),
                    Triple("day_logs", "day:", "date"),
                    Triple("settings", "settings:", "id"),
                )) {
                    db.execSQL("INSERT INTO sync_revisions SELECT '$prefix' || $column, 1, 1, 0 FROM $table")
                }
                db.execSQL(
                    "INSERT OR IGNORE INTO sync_revisions SELECT CASE entity WHEN 'cycle' THEN 'cycle:' ELSE 'legacy:' END || entity_id, 1, 1, 1 FROM sync_tombstones",
                )
                install(db)
            }
        }

    val callback =
        object : RoomDatabase.Callback() {
            override fun onCreate(db: SupportSQLiteDatabase) = install(db)
        }

    internal fun install(db: SupportSQLiteDatabase) {
        for ((table, prefix, column) in listOf(
            Triple("cycles", "cycle:", "id"),
            Triple("day_logs", "day:", "date"),
            Triple("settings", "settings:", "id"),
        )) {
            for (event in listOf("INSERT", "UPDATE", "DELETE")) {
                val row = if (event == "DELETE") "OLD" else "NEW"
                val deleted = if (event == "DELETE") 1 else 0
                db.execSQL(
                    """
                    CREATE TRIGGER IF NOT EXISTS sync_${table}_${event.lowercase()} AFTER $event ON $table BEGIN
                    INSERT INTO sync_revisions SELECT '$prefix' || $row.$column, 0, 0, 0
                    WHERE NOT EXISTS (SELECT 1 FROM sync_revisions WHERE `key` = '$prefix' || $row.$column);
                    UPDATE sync_revisions SET revision = revision + 1, pending = 1, deleted = $deleted WHERE `key` = '$prefix' || $row.$column;
                    END
                    """.trimIndent(),
                )
            }
        }
    }
}
