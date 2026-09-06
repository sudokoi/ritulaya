package expo.modules.ritulayadb

import androidx.room.Room
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.yield
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [28])
class ReminderPublicationTest {
    private lateinit var db: RitulayaDatabase
    private lateinit var store: RitulayaDataStore
    private val scheduled = mutableListOf<ReminderInput>()
    private var registering: CompletableDeferred<Unit>? = null
    private var finishRegistration: CompletableDeferred<Unit>? = null
    private var rejectClear = false
    private val actions =
        object : ReminderActions {
            override suspend fun clear() {
                check(!rejectClear) { "dismissal failed" }
                scheduled.clear()
            }

            override suspend fun schedule(input: ReminderInput) {
                registering?.complete(Unit)
                finishRegistration?.await()
                scheduled += input
            }
        }

    @Before fun setup() =
        runBlocking {
            db =
                Room
                    .inMemoryDatabaseBuilder(
                        RuntimeEnvironment.getApplication(),
                        RitulayaDatabase::class.java,
                    ).addCallback(SyncSchema.callback)
                    .build()
            store = RitulayaDataStore(db, actions)
            store.updateSettings(
                SettingsPatch().apply {
                    reminderDailyLog = 1
                    language = "en-US"
                },
            )
        }

    @After fun close() {
        db.close()
    }

    private fun request() =
        ReminderInput().apply {
            kind = "daily"
            language = "en-US"
            title = "Health reminder"
        }

    @Test fun `local privacy writes wait for registration then remove stale copy`() =
        runBlocking {
            registering = CompletableDeferred()
            finishRegistration = CompletableDeferred()
            val registration = async { store.scheduleReminder(request()) }
            registering!!.await()
            val edit = async { store.updateSettings(SettingsPatch().apply { discreetMode = 1 }) }
            yield()
            assertThat(store.getSettings()?.discreetMode).isEqualTo(0)
            finishRegistration!!.complete(Unit)
            registration.await()
            edit.await()
            assertThat(scheduled).isEmpty()
            assertThat(store.getSettings()?.discreetMode).isEqualTo(1)
        }

    @Test fun `background policy installation outlives a cancelled JS registration caller safely`() =
        runBlocking {
            registering = CompletableDeferred()
            finishRegistration = CompletableDeferred()
            val registration = async { store.scheduleReminder(request()) }
            registering!!.await()
            registration.cancel()
            val snapshot = store.readSyncSnapshot()
            val sync =
                async {
                    store.completeSync(
                        "test",
                        "{}",
                        snapshot.revisions.associate {
                            it.key to it.revision
                        },
                        emptyMap(),
                        emptyMap(),
                        snapshot.settings!!.copy(discreetMode = 1),
                    )
                }
            yield()
            assertThat(store.getSettings()?.discreetMode).isEqualTo(0)
            finishRegistration!!.complete(Unit)
            registration.join()
            sync.await()
            assertThat(scheduled).isEmpty()
            assertThat(store.scheduleReminder(request())).isFalse()
        }

    @Test fun `completed language changes reject queued old-language requests`() =
        runBlocking {
            store.updateSettings(SettingsPatch().apply { language = "ja" })
            assertThat(store.scheduleReminder(request())).isFalse()
            assertThat(store.scheduleReminder(request().apply { language = "ja" })).isTrue()
            assertThat(scheduled).hasSize(1)
        }

    @Test fun `unacknowledged clearing prevents policy installation`() =
        runBlocking {
            rejectClear = true
            try {
                store.updateSettings(SettingsPatch().apply { discreetMode = 1 })
                error("Expected rejection")
            } catch (
                error: IllegalStateException,
            ) {
                assertThat(error.message).isEqualTo("dismissal failed")
            }
            assertThat(store.getSettings()?.discreetMode).isEqualTo(0)
        }
}
