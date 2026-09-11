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
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/** Tests Ritulaya's commands, not Room's transaction or SQLCipher implementation. */
@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [28])
class DayEntryStoreTest {
    @Test
    fun `seven day placement boundary is the same for reverse entry order`(): Unit =
        runBlocking {
            for (date in listOf("2026-06-14", "2026-06-07", "2026-06-01")) store.logPeriodOn(date, "light", 1)
            assertThat(store.listCycles().map { it.startDate }).containsExactly("2026-06-01", "2026-06-14")
            assertThat(store.listCycles().single { it.startDate == "2026-06-01" }.endDate).isEqualTo("2026-06-13")
            val before = store.readSyncSnapshot().revisions
            store.applyCycleRepair(store.previewCycleRepair().getValue("token") as String)
            assertThat(store.readSyncSnapshot().revisions).isEqualTo(before)
        }

    @Test
    fun `clearing the first flow shifts its boundary and removing final flow removes the cycle`(): Unit =
        runBlocking {
            store.logPeriodOn("2026-06-01", "medium", 2)
            store.upsertDayLog(
                DayLogInput().apply {
                    date = "2026-06-01"
                    notes = "retain me"
                    flowIntensity = "none"
                },
            )
            assertThat(store.listCycles().single().startDate).isEqualTo("2026-06-02")
            val second = store.listDayLogs().single { it.date == "2026-06-02" }
            store.deleteDayLog(second.id)
            assertThat(store.listCycles()).isEmpty()
            assertThat(store.listDayLogs().single().notes).isEqualTo("retain me")
            assertThat(store.listDayLogs().single().cycleId).isNull()
        }

    @Test
    fun `backdated bridge flow merges and deleting it splits cycles independently of entry order`(): Unit =
        runBlocking {
            store.logPeriodOn("2026-06-01", "medium", 1)
            store.logPeriodOn("2026-06-09", "medium", 1)
            assertThat(store.listCycles()).hasSize(2)
            store.upsertDayLog(
                DayLogInput().apply {
                    date = "2026-06-05"
                    flowIntensity = "light"
                },
            )
            assertThat(store.listCycles()).hasSize(1)
            assertThat(store.listDayLogs().map { it.cycleId }.distinct()).hasSize(1)
            store.deleteDayLog(store.listDayLogs().single { it.date == "2026-06-05" }.id)
            assertThat(store.listCycles().single { it.startDate == "2026-06-01" }.endDate).isEqualTo("2026-06-08")
            assertThat(store.listCycles().single { it.startDate == "2026-06-09" }.endDate).isNull()
        }

    @Test
    fun `historical orphan repair is previewed without mutation and rejects stale confirmation`(): Unit =
        runBlocking {
            val orphan = store.createCycle("2025-01-01")
            store.logPeriodOn("2026-06-01", "medium", 1)
            assertThat(store.listCycles().any { it.id == orphan.id }).isTrue()
            val preview = store.previewCycleRepair()
            assertThat(store.listCycles()).hasSize(2)
            store.upsertDayLog(
                DayLogInput().apply {
                    date = "2026-06-01"
                    notes = "late edit"
                },
            )
            try {
                store.applyCycleRepair(preview.getValue("token") as String)
                error("Expected stale preview rejection")
            } catch (
                _: IllegalArgumentException,
            ) {
            }
            assertThat(store.listCycles()).hasSize(2)
            store.applyCycleRepair(store.previewCycleRepair().getValue("token") as String)
            assertThat(store.listCycles()).hasSize(1)
            assertThat(store.listDayLogs().single().notes).isEqualTo("late edit")
            assertThat(store.listTombstones().any { it.entityId == orphan.id }).isTrue()
        }

    private lateinit var db: RitulayaDatabase
    private lateinit var store: RitulayaDataStore
    private val clock = Clock.fixed(Instant.parse("2026-09-11T00:30:00Z"), ZoneId.of("America/Los_Angeles"))

    @Before
    fun setUp() {
        db =
            Room
                .inMemoryDatabaseBuilder(
                    RuntimeEnvironment.getApplication(),
                    RitulayaDatabase::class.java,
                ).addCallback(SyncSchema.callback)
                .build()
        store = RitulayaDataStore(db, clock = clock)
    }

    @After
    fun tearDown() {
        db.close()
    }

    @Test
    fun `new entries are unrecorded and partial edits preserve an explicit No until cleared`(): Unit =
        runBlocking {
            store.saveDayEntry(
                DayLogInput().apply {
                    date = "2026-06-01"
                    flowIntensity = "medium"
                },
            )
            assertThat(store.listDayLogs().all { it.sexualActivity == null }).isTrue()
            store.upsertDayLog(
                DayLogInput().apply {
                    date = "2026-06-01"
                    sexualActivity = false
                },
            )
            store.upsertDayLog(
                DayLogInput().apply {
                    date = "2026-06-01"
                    notes = "keep No"
                },
            )
            assertThat(store.listDayLogs().single { it.date == "2026-06-01" }.sexualActivity).isEqualTo(0)
            store.upsertDayLog(
                DayLogInput().apply {
                    date = "2026-06-01"
                    clearFields = listOf("sexualActivity")
                },
            )
            val cleared = store.listDayLogs().single { it.date == "2026-06-01" }
            assertThat(cleared.sexualActivity).isNull()
            assertThat(cleared.notes).isEqualTo("keep No")
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
    fun `saving and editing flow records only the selected day`(): Unit =
        runBlocking {
            store.saveDayEntry(
                DayLogInput().apply {
                    date = "2026-06-01"
                    flowIntensity = "medium"
                    symptoms = listOf("cramps")
                    notes = "first entry"
                },
            )

            val original = store.listDayLogs().single { it.date == "2026-06-01" }
            assertThat(store.listDayLogs()).hasSize(1)
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
            )

            val edited = store.listDayLogs().single { it.date == "2026-06-01" }
            assertThat(store.listDayLogs()).hasSize(1)
            assertThat(store.listCycles()).hasSize(1)
            assertThat(edited.id).isEqualTo(original.id)
            assertThat(edited.cycleId).isEqualTo(original.cycleId)
            assertThat(edited.flowIntensity).isEqualTo("heavy")
            assertThat(edited.symptoms).isEqualTo("[]")
            assertThat(edited.notes).isEqualTo("edited entry")
        }

    @Test
    fun `adding flow to a notes entry leaves adjacent recorded days untouched`(): Unit =
        runBlocking {
            store.upsertDayLog(
                DayLogInput().apply {
                    date = "2026-06-01"
                    notes = "first"
                },
            )
            val next =
                store.upsertDayLog(
                    DayLogInput().apply {
                        date = "2026-06-02"
                        flowIntensity = "none"
                        notes = "second"
                    },
                )
            store.saveDayEntry(
                DayLogInput().apply {
                    date = "2026-06-01"
                    flowIntensity = "light"
                },
            )
            assertThat(store.listDayLogs()).hasSize(2)
            val unchanged = store.listDayLogs().single { it.date == next.date }
            assertThat(unchanged.flowIntensity).isEqualTo("none")
            assertThat(unchanged.notes).isEqualTo("second")
        }

    @Test
    fun `seeding an ongoing period only fills elapsed dates`(): Unit =
        runBlocking {
            val today = LocalDate.now(clock)
            store.logPeriodOn(today.minusDays(1).toString(), "medium", 5)
            assertThat(store.listDayLogs().map { it.date }).containsExactly(today.minusDays(1).toString(), today.toString())
        }

    @Test
    fun `future entry writes and seeds are rejected without changing history`(): Unit =
        runBlocking {
            val future = LocalDate.now(clock).plusDays(1).toString()
            for (write in listOf<suspend () -> Unit>(
                {
                    store.saveDayEntry(
                        DayLogInput().apply {
                            date = future
                            flowIntensity = "medium"
                        },
                    )
                },
                {
                    store.upsertDayLog(
                        DayLogInput().apply {
                            date = future
                            notes = "future"
                        },
                    )
                },
                { store.logPeriodOn(future, "medium", 5) },
            )) {
                try {
                    write()
                    error("Expected future date rejection")
                } catch (_: IllegalArgumentException) {
                    assertThat(store.listDayLogs()).isEmpty()
                    assertThat(store.listCycles()).isEmpty()
                }
            }
        }
}
