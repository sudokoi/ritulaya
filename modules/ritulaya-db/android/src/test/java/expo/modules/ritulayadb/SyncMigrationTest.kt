package expo.modules.ritulayadb

import android.database.sqlite.SQLiteDatabase
import androidx.room.Room
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import java.util.UUID

/** Exercises our shipped v1 schema and our migration, not SQLCipher's encryption guarantees. */
@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [28])
class SyncMigrationTest {
    @Test
    fun `version one retains notes settings lock and deletions while seeding revisions`() = migrate(1)

    @Test
    fun `version two retains revisions and checkpoints while adding unrecorded activity`() = migrate(2)

    private fun migrate(version: Int): Unit =
        runBlocking {
            val context = RuntimeEnvironment.getApplication()
            val name = "migration-${UUID.randomUUID()}.db"
            val path = context.getDatabasePath(name)
            path.parentFile?.mkdirs()
            val schema =
                requireNotNull(javaClass.getResourceAsStream("/expo.modules.ritulayadb.RitulayaDatabase/$version.json"))
                    .bufferedReader()
                    .use { JSONObject(it.readText()).getJSONObject("database") }
            SQLiteDatabase.openOrCreateDatabase(path, null).use { old ->
                val entities = schema.getJSONArray("entities")
                for (index in 0 until entities.length()) {
                    val entity = entities.getJSONObject(index)
                    old.execSQL(entity.getString("createSql").replace("\${TABLE_NAME}", entity.getString("tableName")))
                    val indices = entity.optJSONArray("indices") ?: org.json.JSONArray()
                    for (i in 0 until indices.length()) {
                        old.execSQL(
                            indices.getJSONObject(i).getString("createSql").replace("\${TABLE_NAME}", entity.getString("tableName")),
                        )
                    }
                }
                val setup = schema.getJSONArray("setupQueries")
                for (i in 0 until setup.length()) old.execSQL(setup.getString(i))
                old.execSQL(
                    "INSERT INTO day_logs VALUES ('entry', '2026-06-01', NULL, NULL, '[]', NULL, 'keep my note', NULL, NULL, 0, '2026-06-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z')",
                )
                old.execSQL(
                    "INSERT INTO settings (id, biometric_lock, created_at, updated_at) VALUES ('default', 1, '2026-06-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z')",
                )
                old.execSQL("INSERT INTO sync_tombstones VALUES ('day_log', 'deleted-entry', '2026-06-02T00:00:00.000Z')")
                if (version == 2) {
                    old.execSQL("UPDATE day_logs SET sexual_activity = 1")
                    old.execSQL("INSERT INTO device_policy VALUES ('default', 1)")
                    old.execSQL("UPDATE settings SET biometric_lock = 0")
                    for (key in listOf("day:2026-06-01", "settings:default", "legacy:deleted-entry")) {
                        old.execSQL("INSERT INTO sync_revisions VALUES (?, 7, 1, ?)", arrayOf(key, if (key.startsWith("legacy:")) 1 else 0))
                    }
                    old.execSQL("INSERT INTO sync_checkpoints VALUES ('target', '{\"marker\":\"preserved\"}')")
                }
                old.version = version
            }
            val db =
                Room
                    .databaseBuilder(
                        context,
                        RitulayaDatabase::class.java,
                        name,
                    ).addMigrations(SyncSchema.migration, EntrySchema.migration)
                    .addCallback(SyncSchema.callback)
                    .build()
            try {
                val store = RitulayaDataStore(db)
                val snapshot = store.readSyncSnapshot()
                assertThat(
                    snapshot.dayLogs
                        .single { it.id == "entry" }
                        .value
                        ?.notes,
                ).isEqualTo("keep my note")
                assertThat(snapshot.settings?.biometricLock).isEqualTo(1)
                assertThat(
                    snapshot.dayLogs
                        .single { it.id == "entry" }
                        .value
                        ?.sexualActivity,
                ).isEqualTo(if (version == 1) 0 else 1)
                assertThat(snapshot.revisions.map { it.key }).containsExactly("day:2026-06-01", "settings:default", "legacy:deleted-entry")
                assertThat(snapshot.revisions.all { it.pending && it.revision == if (version == 1) 1L else 7L }).isTrue()
                if (version == 2) assertThat(store.syncCheckpoint("target")).isEqualTo("{\"marker\":\"preserved\"}")
                store.upsertDayLog(
                    DayLogInput().apply {
                        date = "2026-06-01"
                        sexualActivity = true
                    },
                )
                assertThat(store.listDayLogs().single().sexualActivity).isEqualTo(1)
                store.upsertDayLog(
                    DayLogInput().apply {
                        date = "2026-06-01"
                        clearFields = listOf("sexualActivity")
                    },
                )
                assertThat(store.listDayLogs().single().sexualActivity).isNull()
                assertThat(
                    store
                        .readSyncSnapshot()
                        .revisions
                        .single { it.key == "day:2026-06-01" }
                        .revision,
                ).isGreaterThan(
                    if (version ==
                        1
                    ) {
                        1L
                    } else {
                        7L
                    },
                )
                store.updateSettings(SettingsPatch().apply { theme = "dark" })
                assertThat(
                    store
                        .readSyncSnapshot()
                        .revisions
                        .single { it.key == "settings:default" }
                        .revision,
                ).isGreaterThan(1L)
            } finally {
                db.close()
                context.deleteDatabase(name)
            }
        }
}
