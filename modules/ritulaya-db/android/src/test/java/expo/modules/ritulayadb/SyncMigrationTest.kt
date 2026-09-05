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
    fun `version one retains notes settings lock and deletions while seeding revisions`(): Unit =
        runBlocking {
            val context = RuntimeEnvironment.getApplication()
            val name = "migration-${UUID.randomUUID()}.db"
            val path = context.getDatabasePath(name)
            path.parentFile?.mkdirs()
            val schema =
                requireNotNull(javaClass.getResourceAsStream("/expo.modules.ritulayadb.RitulayaDatabase/1.json"))
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
                old.version = 1
            }
            val db =
                Room
                    .databaseBuilder(
                        context,
                        RitulayaDatabase::class.java,
                        name,
                    ).addMigrations(SyncSchema.migration)
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
                assertThat(snapshot.revisions.map { it.key }).containsExactly("day:2026-06-01", "settings:default", "legacy:deleted-entry")
                assertThat(snapshot.revisions.all { it.pending && it.revision == 1L }).isTrue()
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
