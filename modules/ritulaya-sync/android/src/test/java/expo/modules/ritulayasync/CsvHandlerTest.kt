package expo.modules.ritulayasync

import com.google.common.truth.Truth.assertThat
import expo.modules.ritulayasync.CsvHandler.CycleRow
import expo.modules.ritulayasync.CsvHandler.DayLogRow
import org.junit.Assert.assertThrows
import org.junit.Test

class CsvHandlerTest {
    @Test
    fun `cycles round-trip through CSV`() {
        val rows =
            listOf(
                CycleRow("1", "2026-06-01", "2026-06-28", "2026-06-01T00:00:00.000Z", "2026-06-28T00:00:00.000Z", null),
            )

        val parsed = CsvHandler.parseCycles(CsvHandler.writeCycles(rows))

        assertThat(parsed).hasSize(1)
        assertThat(parsed[0].id).isEqualTo("1")
        assertThat(parsed[0].startDate).isEqualTo("2026-06-01")
        assertThat(parsed[0].endDate).isEqualTo("2026-06-28")
        assertThat(parsed[0].deletedAt).isNull()
    }

    @Test
    fun `day logs quote notes containing commas`() {
        val rows =
            listOf(
                dayLog("1", notes = "felt, okay"),
            )

        val parsed = CsvHandler.parseDayLogs(CsvHandler.writeDayLogs(rows))

        assertThat(parsed).hasSize(1)
        assertThat(parsed[0].notes).isEqualTo("felt, okay")
    }

    @Test
    fun `notes newlines are flattened`() {
        val rows = listOf(dayLog("1", notes = "line1\nline2"))

        val parsed = CsvHandler.parseDayLogs(CsvHandler.writeDayLogs(rows))

        assertThat(parsed[0].notes).isEqualTo("line1 line2")
    }

    @Test
    fun `symptoms JSON survives round-trip`() {
        val rows = listOf(dayLog("1", symptoms = "[\"cramps\",\"headache\"]"))

        val parsed = CsvHandler.parseDayLogs(CsvHandler.writeDayLogs(rows))

        assertThat(parsed[0].symptoms).isEqualTo("[\"cramps\",\"headache\"]")
    }

    @Test
    fun `bad header aborts instead of treating remote data as empty`() {
        assertThrows(IllegalArgumentException::class.java) { CsvHandler.parseCycles("not,a,header\n1,2,3") }
        assertThrows(IllegalArgumentException::class.java) { CsvHandler.parseDayLogs("not,a,header\n1,2,3") }
    }

    @Test
    fun `header-only files are valid empty datasets`() {
        assertThat(CsvHandler.parseCycles(CsvHandler.writeCycles(emptyList()))).isEmpty()
        assertThat(CsvHandler.parseDayLogs(CsvHandler.writeDayLogs(emptyList()))).isEmpty()
    }

    @Test
    fun `malformed and duplicate live rows are rejected`() {
        listOf(dayLog(""), dayLog("a").copy(flowIntensity = "unknown"), dayLog("a").copy(sexualActivity = 7)).forEach {
            assertThrows(IllegalArgumentException::class.java) { CsvHandler.parseDayLogs(CsvHandler.writeDayLogs(listOf(it))) }
        }
        assertThrows(IllegalArgumentException::class.java) {
            CsvHandler.parseDayLogs(CsvHandler.writeDayLogs(listOf(dayLog("a"), dayLog("b"))))
        }
    }

    @Test
    fun `tombstones with intentionally empty health fields remain readable`() {
        val row = CycleRow("a", "", null, "", "2026-06-01T00:00:00.000Z", "2026-06-01T00:00:00.000Z")
        assertThat(CsvHandler.parseCycles(CsvHandler.writeCycles(listOf(row)))).containsExactly(row)
    }

    private fun dayLog(
        id: String,
        symptoms: String = "[]",
        notes: String? = null,
    ): DayLogRow =
        DayLogRow(
            id = id,
            date = "2026-06-01",
            cycleId = "c1",
            flowIntensity = "medium",
            symptoms = symptoms,
            mood = "happy",
            notes = notes,
            cervicalMucus = null,
            bbt = null,
            sexualActivity = 0,
            createdAt = "2026-06-01T00:00:00.000Z",
            updatedAt = "2026-06-01T00:00:00.000Z",
            deletedAt = null,
        )
}
