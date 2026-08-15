package expo.modules.ritulayapredictions

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import java.time.LocalDate

class PredictionEngineTest {
    private val config =
        PredictionEngine.Config(
            avgCycleLength = 28,
            avgPeriodLength = 5,
            lutealPhaseLength = 14,
        )

    @Test
    fun `returns population fallback with no completed cycles`() {
        val result = PredictionEngine.predict(emptyList(), config)

        assertThat(result.confidence).isEqualTo(0.3)
        assertThat(result.cyclesUsed).isEqualTo(0)
        assertThat(result.engine).isEqualTo("wma")
    }

    @Test
    fun `returns WMA prediction with 3 completed cycles`() {
        val cycles =
            listOf(
                PredictionEngine.CycleInput("a", "2026-06-01", "2026-06-28"),
                PredictionEngine.CycleInput("b", "2026-07-01", "2026-07-29"),
                PredictionEngine.CycleInput("c", "2026-08-02", "2026-08-30"),
            )

        val result = PredictionEngine.predict(cycles, config)

        assertThat(result.cyclesUsed).isEqualTo(3)
        assertThat(result.confidence).isEqualTo(0.7)
        assertThat(result.engine).isEqualTo("wma")
        assertThat(result.nextPeriodStart).isEqualTo(LocalDate.parse("2026-08-31"))
        assertThat(result.nextPeriodEnd).isEqualTo(LocalDate.parse("2026-09-04"))
    }

    @Test
    fun `anchors prediction on the most recent cycle even when it is still open`() {
        val cycles =
            listOf(
                PredictionEngine.CycleInput("a", "2026-06-01", "2026-06-28"),
                PredictionEngine.CycleInput("b", "2026-06-29", null),
            )

        val result = PredictionEngine.predict(cycles, config)

        assertThat(result.nextPeriodStart).isEqualTo(LocalDate.parse("2026-07-27"))
        assertThat(result.nextPeriodEnd).isEqualTo(LocalDate.parse("2026-07-31"))
        assertThat(result.cyclesUsed).isEqualTo(1)
    }

    @Test
    fun `uses WMA weights so recent cycles count more`() {
        val stable =
            listOf(
                PredictionEngine.CycleInput("a", "2026-03-01", "2026-03-29"),
                PredictionEngine.CycleInput("b", "2026-03-30", "2026-04-27"),
                PredictionEngine.CycleInput("c", "2026-04-28", "2026-05-26"),
            )

        val irregular =
            listOf(
                PredictionEngine.CycleInput("a", "2026-03-01", "2026-03-22"),
                PredictionEngine.CycleInput("b", "2026-03-23", "2026-04-14"),
                PredictionEngine.CycleInput("c", "2026-04-28", "2026-05-26"),
            )

        val stableResult = PredictionEngine.predict(stable, config)
        val irregularResult = PredictionEngine.predict(irregular, config)

        assertThat(stableResult.nextPeriodStart).isNotEqualTo(irregularResult.nextPeriodStart)
    }

    @Test
    fun `ovulation is lutealPhaseLength days before predicted period`() {
        val cycles = listOf(PredictionEngine.CycleInput("a", "2026-06-01", "2026-06-28"))

        val result = PredictionEngine.predict(cycles, config)

        val diff = result.nextPeriodStart.toEpochDay() - result.ovulationDay.toEpochDay()
        assertThat(diff).isEqualTo(14)
    }

    @Test
    fun `fertile window is 3 days before and 1 day after ovulation`() {
        val cycles = listOf(PredictionEngine.CycleInput("a", "2026-06-01", "2026-06-28"))

        val result = PredictionEngine.predict(cycles, config)

        val fertileDays = result.fertileWindowEnd.toEpochDay() - result.fertileWindowStart.toEpochDay()
        assertThat(fertileDays).isEqualTo(4)
    }

    @Test
    fun `averagePeriodLength derives from flow logs and returns fallback when empty`() {
        val cycles = listOf(PredictionEngine.CycleInput("c1", "2026-06-01", "2026-06-28"))
        val logs =
            listOf(
                PredictionEngine.DayLogInput("2026-06-01", "c1", "medium"),
                PredictionEngine.DayLogInput("2026-06-05", "c1", "light"),
                PredictionEngine.DayLogInput("2026-06-10", "c1", "none"),
            )

        assertThat(PredictionEngine.averagePeriodLength(cycles, logs, 3)).isEqualTo(5)
        assertThat(PredictionEngine.averagePeriodLength(emptyList(), emptyList(), 3)).isEqualTo(3)
    }

    @Test
    fun `averageCycleLength is the simple mean and returns fallback when empty`() {
        val cycles =
            listOf(
                PredictionEngine.CycleInput("a", "2026-03-01", "2026-03-28"),
                PredictionEngine.CycleInput("b", "2026-03-29", "2026-04-25"),
                PredictionEngine.CycleInput("c", "2026-04-26", "2026-05-23"),
            )

        assertThat(PredictionEngine.averageCycleLength(cycles, 28)).isEqualTo(28)
        assertThat(PredictionEngine.averageCycleLength(emptyList(), 28)).isEqualTo(28)
    }

    @Test
    fun `phase derives from days until next period`() {
        assertThat(PredictionEngine.phase(3, 28)).isEqualTo("menstrual")
        assertThat(PredictionEngine.phase(20, 28)).isEqualTo("follicular")
        assertThat(PredictionEngine.phase(14, 28)).isEqualTo("ovulation")
        assertThat(PredictionEngine.phase(6, 28)).isEqualTo("luteal")
    }
}
