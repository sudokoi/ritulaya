package expo.modules.ritulayadb

import com.google.common.truth.Truth.assertThat
import org.junit.Test

/**
 * Pins the bridge's clear convention: null keeps the stored value, an empty
 * string clears text fields, 0.0 clears BBT. If these tests fail, the
 * contract between saveDayEntry (JS) and resolveDayLogFields has drifted.
 */
class DayLogPatchTest {
    private fun existing() =
        DayLogEntity(
            id = "log-1",
            date = "2026-03-01",
            cycleId = "cycle-1",
            flowIntensity = "medium",
            symptoms = "[\"cramps\"]",
            mood = "tired",
            notes = "old note",
            cervicalMucus = "sticky",
            bbt = 36.5,
            sexualActivity = 1,
            createdAt = "2026-03-01T00:00:00.000Z",
            updatedAt = "2026-03-01T00:00:00.000Z",
        )

    @Test
    fun `null keeps every stored value`() {
        val resolved = resolveDayLogFields(DayLogInput(), existing())

        assertThat(resolved.cycleId).isEqualTo("cycle-1")
        assertThat(resolved.flowIntensity).isEqualTo("medium")
        assertThat(resolved.mood).isEqualTo("tired")
        assertThat(resolved.notes).isEqualTo("old note")
        assertThat(resolved.cervicalMucus).isEqualTo("sticky")
        assertThat(resolved.bbt).isEqualTo(36.5)
        assertThat(resolved.sexualActivity).isEqualTo(1)
    }

    @Test
    fun `a value overwrites the stored one`() {
        val input =
            DayLogInput().apply {
                mood = "calm"
                bbt = 36.8
                sexualActivity = false
            }

        val resolved = resolveDayLogFields(input, existing())

        assertThat(resolved.mood).isEqualTo("calm")
        assertThat(resolved.bbt).isEqualTo(36.8)
        assertThat(resolved.sexualActivity).isEqualTo(0)
    }

    @Test
    fun `empty string explicitly clears a text field`() {
        val input =
            DayLogInput().apply {
                mood = CLEAR_TEXT
                notes = CLEAR_TEXT
                cervicalMucus = CLEAR_TEXT
            }

        val resolved = resolveDayLogFields(input, existing())

        assertThat(resolved.mood).isNull()
        assertThat(resolved.notes).isNull()
        assertThat(resolved.cervicalMucus).isNull()
    }

    @Test
    fun `zero BBT explicitly clears the field`() {
        val resolved = resolveDayLogFields(DayLogInput().apply { bbt = CLEAR_BBT }, existing())

        assertThat(resolved.bbt).isNull()
    }

    @Test
    fun `symptoms always reflect the incoming list`() {
        val cleared =
            resolveDayLogFields(
                DayLogInput().apply { symptoms = emptyList() },
                existing(),
            )
        val replaced =
            resolveDayLogFields(
                DayLogInput().apply { symptoms = listOf("bloating", "headache") },
                existing(),
            )

        assertThat(cleared.symptomsJson).isEqualTo("[]")
        assertThat(replaced.symptomsJson).isEqualTo("[\"bloating\",\"headache\"]")
    }

    @Test
    fun `a new row falls back to defaults instead of stored values`() {
        val input =
            DayLogInput().apply {
                date = "2026-03-02"
                flowIntensity = "none"
            }

        val resolved = resolveDayLogFields(input, null)

        assertThat(resolved.cycleId).isNull()
        assertThat(resolved.flowIntensity).isEqualTo("none")
        assertThat(resolved.mood).isNull()
        assertThat(resolved.bbt).isNull()
        assertThat(resolved.sexualActivity).isEqualTo(0)
    }
}
