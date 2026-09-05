package expo.modules.ritulayadb

import androidx.room.Room
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [28])
class SyncPersistenceTest {
    @Test
    fun `remote IDs cannot replace another local date`(): Unit =
        runBlocking {
            val first =
                store.upsertDayLog(
                    DayLogInput().apply {
                        date = "2026-06-01"
                        notes = "first"
                    },
                )
            val captured = revisions()
            store.completeSync(
                "repo",
                "{}",
                captured,
                emptyMap(),
                mapOf(
                    "2026-06-01" to first.copy(id = "different-remote-id"),
                    "2026-06-02" to first.copy(date = "2026-06-02", notes = "second"),
                ),
                null,
            )
            assertThat(store.listDayLogs().map { it.date }).containsExactly("2026-06-01", "2026-06-02")
            assertThat(store.listDayLogs().single { it.date == "2026-06-01" }.id).isEqualTo(first.id)
        }

    private lateinit var db: RitulayaDatabase
    private lateinit var store: RitulayaDataStore

    @Before fun setUp() {
        db =
            Room
                .inMemoryDatabaseBuilder(
                    RuntimeEnvironment.getApplication(),
                    RitulayaDatabase::class.java,
                ).addCallback(SyncSchema.callback)
                .build()
        store = RitulayaDataStore(db)
    }

    @After fun tearDown() = db.close()

    private suspend fun revisions() = store.readSyncSnapshot().revisions.associate { it.key to it.revision }

    @Test fun `same-timestamp local edits survive completion and remain pending`(): Unit =
        runBlocking {
            store.updateSettings(SettingsPatch().apply { theme = "light" })
            val settings = requireNotNull(store.getSettings())
            val captured = revisions()
            db.dao().upsertSettings(settings.copy(theme = "dark"))
            store.completeSync("repo", "baseline", captured, emptyMap(), emptyMap(), settings.copy(theme = "system"))
            assertThat(store.getSettings()?.theme).isEqualTo("dark")
            assertThat(
                store
                    .readSyncSnapshot()
                    .revisions
                    .single()
                    .pending,
            ).isTrue()
            assertThat(store.syncCheckpoint("repo")).isEqualTo("baseline")
        }

    @Test fun `deletion during upload cannot be resurrected or acknowledged by the older upload`(): Unit =
        runBlocking {
            val row =
                store.upsertDayLog(
                    DayLogInput().apply {
                        date = "2026-06-01"
                        notes = "original"
                    },
                )
            val captured = revisions()
            store.deleteDayLog(row.id)
            store.completeSync("repo", "baseline", captured, emptyMap(), mapOf(row.date to row), null)
            assertThat(store.listDayLogs()).isEmpty()
            val deletion = store.readSyncSnapshot().revisions.single()
            assertThat(deletion.pending).isTrue()
            assertThat(deletion.deleted).isTrue()
            store.completeSync("repo", "deletion baseline", revisions(), emptyMap(), mapOf(row.date to null), null)
            assertThat(
                store
                    .readSyncSnapshot()
                    .revisions
                    .single()
                    .pending,
            ).isFalse()
        }

    @Test fun `device policy neither advances sync revision nor accepts remote lock values`(): Unit =
        runBlocking {
            store.updateSettings(
                SettingsPatch().apply {
                    theme = "light"
                    biometricLock = 1
                },
            )
            val captured = revisions()
            store.updateSettings(SettingsPatch().apply { biometricLock = 0 })
            assertThat(revisions()).isEqualTo(captured)
            val settings = requireNotNull(store.getSettings())
            store.completeSync("repo", "baseline", captured, emptyMap(), emptyMap(), settings.copy(theme = "dark", biometricLock = 1))
            assertThat(store.getSettings()?.biometricLock).isEqualTo(0)
            assertThat(store.getSettings()?.theme).isEqualTo("dark")
            assertThat(
                store
                    .readSyncSnapshot()
                    .revisions
                    .single()
                    .pending,
            ).isFalse()
        }
}
