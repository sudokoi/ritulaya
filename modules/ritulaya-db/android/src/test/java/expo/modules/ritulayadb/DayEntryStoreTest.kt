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

/** Tests Ritulaya's commands, not Room's transaction or SQLCipher implementation. */
@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [28])
class DayEntryStoreTest {
    private lateinit var db: RitulayaDatabase
    private lateinit var store: RitulayaDataStore

    @Before
    fun setUp() {
        db = Room.inMemoryDatabaseBuilder(RuntimeEnvironment.getApplication(), RitulayaDatabase::class.java).build()
        store = RitulayaDataStore(db)
    }

    @After
    fun tearDown() {
        db.close()
    }

    @Test
    fun `period fill associates every entry with the chosen cycle`(): Unit =
        runBlocking {
            store.logPeriodOn("2026-06-01", "medium", 3)

            val cycle = store.listCycles().single()
            val logs = store.listDayLogs()
            assertThat(logs.map { it.date }).containsExactly("2026-06-01", "2026-06-02", "2026-06-03")
            assertThat(logs.map { it.cycleId }.distinct()).containsExactly(cycle.id)
        }

    @Test
    fun `period fill preserves the other fields of an existing entry`(): Unit =
        runBlocking {
            val original =
                store.upsertDayLog(
                    DayLogInput().apply {
                        date = "2026-06-02"
                        symptoms = listOf("cramps")
                        mood = "calm"
                        notes = "keep this note"
                        cervicalMucus = "sticky"
                        bbt = 36.5
                        sexualActivity = true
                    },
                )

            store.logPeriodOn("2026-06-01", "medium", 3)

            val updated = store.listDayLogs().single { it.date == "2026-06-02" }
            assertThat(updated.symptoms).isEqualTo("[\"cramps\"]")
            assertThat(updated.mood).isEqualTo("calm")
            assertThat(updated.notes).isEqualTo("keep this note")
            assertThat(updated.cervicalMucus).isEqualTo("sticky")
            assertThat(updated.bbt).isEqualTo(36.5)
            assertThat(updated.sexualActivity).isEqualTo(1)
            assertThat(updated.id).isEqualTo(original.id)
            assertThat(updated.createdAt).isEqualTo(original.createdAt)
            assertThat(updated.flowIntensity).isEqualTo("medium")
            assertThat(updated.cycleId).isEqualTo(store.listCycles().single().id)
        }

    @Test
    fun `saving a new flow entry fills once and later edits use persisted flow`(): Unit =
        runBlocking {
            store.saveDayEntry(
                DayLogInput().apply {
                    date = "2026-06-01"
                    flowIntensity = "medium"
                    symptoms = listOf("cramps")
                    notes = "first entry"
                },
                3,
            )

            val original = store.listDayLogs().single { it.date == "2026-06-01" }
            assertThat(store.listDayLogs()).hasSize(3)
            assertThat(original.symptoms).isEqualTo("[\"cramps\"]")
            assertThat(original.notes).isEqualTo("first entry")
            assertThat(original.cycleId).isEqualTo(store.listCycles().single().id)

            store.saveDayEntry(
                DayLogInput().apply {
                    date = "2026-06-01"
                    flowIntensity = "heavy"
                    symptoms = emptyList()
                    notes = "edited entry"
                },
                5,
            )

            val edited = store.listDayLogs().single { it.date == "2026-06-01" }
            assertThat(store.listDayLogs()).hasSize(3)
            assertThat(store.listCycles()).hasSize(1)
            assertThat(edited.id).isEqualTo(original.id)
            assertThat(edited.cycleId).isEqualTo(original.cycleId)
            assertThat(edited.flowIntensity).isEqualTo("heavy")
            assertThat(edited.symptoms).isEqualTo("[]")
            assertThat(edited.notes).isEqualTo("edited entry")
        }
}
