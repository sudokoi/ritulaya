package expo.modules.ritulayadb

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

/** Preserve recorded 0/1 values; only future unrecorded values become SQL null. */
object EntrySchema {
    val migration =
        object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    """
                    CREATE TABLE day_logs_nullable (
                        id TEXT NOT NULL PRIMARY KEY, date TEXT NOT NULL, cycle_id TEXT,
                        flow_intensity TEXT, symptoms TEXT NOT NULL DEFAULT '[]', mood TEXT,
                        notes TEXT, cervical_mucus TEXT, bbt REAL, sexual_activity INTEGER,
                        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
                    )
                    """.trimIndent(),
                )
                db.execSQL("INSERT INTO day_logs_nullable SELECT * FROM day_logs")
                db.execSQL("DROP TABLE day_logs")
                db.execSQL("ALTER TABLE day_logs_nullable RENAME TO day_logs")
                db.execSQL("CREATE UNIQUE INDEX index_day_logs_date ON day_logs(date)")
                SyncSchema.install(db)
            }
        }
}
