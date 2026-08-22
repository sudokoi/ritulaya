package expo.modules.ritulayapredictions

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import java.time.LocalDate
import java.time.temporal.ChronoUnit

class PredictionEngineTest {
    private val config =
        PredictionEngine.Config(
            avgCycleLength = 28,
            avgPeriodLength = 5,
            lutealPhaseLength = 14,
        )

    private val today = LocalDate.now()

    private fun daysAgo(days: Long): String = today.minusDays(days).toString()

    private fun daysAhead(days: Long): String = today.plusDays(days).toString()

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
                PredictionEngine.CycleInput("a", daysAgo(84), daysAgo(56)),
                PredictionEngine.CycleInput("b", daysAgo(55), daysAgo(27)),
                PredictionEngine.CycleInput("c", daysAgo(26), daysAgo(1)),
            )

        val result = PredictionEngine.predict(cycles, config)

        assertThat(result.cyclesUsed).isEqualTo(3)
        // Lengths 29/29/26 give a perfectly regular history by the MAD measure:
        // regularity factor 1.0 times the 3-cycle volume tier 0.7.
        assertThat(result.confidence).isEqualTo(0.7)
        assertThat(result.engine).isEqualTo("wma")
        assertThat(result.nextPeriodStart).isEqualTo(LocalDate.parse(daysAgo(26)).plusDays(28))
        assertThat(result.nextPeriodEnd).isEqualTo(LocalDate.parse(daysAgo(26)).plusDays(32))
    }

    @Test
    fun `anchors prediction on the most recent cycle even when it is still open`() {
        val cycles =
            listOf(
                PredictionEngine.CycleInput("a", daysAgo(38), daysAgo(10)),
                PredictionEngine.CycleInput("b", daysAgo(9), null),
            )

        val result = PredictionEngine.predict(cycles, config)

        assertThat(result.nextPeriodStart).isEqualTo(LocalDate.parse(daysAgo(9)).plusDays(28))
        assertThat(result.nextPeriodEnd).isEqualTo(LocalDate.parse(daysAgo(9)).plusDays(32))
        assertThat(result.cyclesUsed).isEqualTo(1)
    }

    @Test
    fun `clamps next period to today when the anchored cycle is overdue`() {
        val cycles =
            listOf(
                PredictionEngine.CycleInput("a", daysAgo(60), daysAgo(32)),
                PredictionEngine.CycleInput("b", daysAgo(30), null),
            )

        val result = PredictionEngine.predict(cycles, config)

        assertThat(result.nextPeriodStart).isEqualTo(today)
        assertThat(result.nextPeriodEnd).isEqualTo(LocalDate.parse(daysAhead(4)))
        // Ovulation stays anchored to the predicted period start, so an
        // overdue period puts ovulation and the fertile window in the past.
        assertThat(result.ovulationDay).isEqualTo(today.minusDays(14))
        assertThat(result.fertileWindowStart).isEqualTo(today.minusDays(17))
        assertThat(result.fertileWindowEnd).isEqualTo(today.minusDays(13))
    }

    @Test
    fun `resets to population defaults when history is stale`() {
        val cycles =
            listOf(
                PredictionEngine.CycleInput("a", daysAgo(200), daysAgo(172)),
                PredictionEngine.CycleInput("b", daysAgo(170), daysAgo(142)),
            )

        val result = PredictionEngine.predict(cycles, config)

        assertThat(result.cyclesUsed).isEqualTo(0)
        assertThat(result.confidence).isEqualTo(0.3)
        assertThat(result.nextPeriodStart).isEqualTo(today.plusDays(config.avgCycleLength - 1L))
    }

    @Test
    fun `keeps predicting when the newest period is within the freshness limit`() {
        val cycles =
            listOf(
                PredictionEngine.CycleInput("a", daysAgo(100), daysAgo(72)),
                PredictionEngine.CycleInput("b", daysAgo(70), daysAgo(42)),
                PredictionEngine.CycleInput("c", daysAgo(40), daysAgo(12)),
            )

        val result = PredictionEngine.predict(cycles, config)

        assertThat(result.cyclesUsed).isEqualTo(3)
    }

    @Test
    fun `an outlier cycle contributes with reduced weight instead of being discarded`() {
        val regularOnly =
            listOf(
                PredictionEngine.CycleInput("a", daysAgo(84), daysAgo(56)),
                PredictionEngine.CycleInput("b", daysAgo(55), daysAgo(27)),
                PredictionEngine.CycleInput("c", daysAgo(26), daysAgo(1)),
            )
        val withOutlier =
            listOf(
                PredictionEngine.CycleInput("a", daysAgo(84), daysAgo(56)),
                PredictionEngine.CycleInput("b", daysAgo(55), daysAgo(27)),
                PredictionEngine.CycleInput("c", daysAgo(26), daysAgo(1)),
                PredictionEngine.CycleInput("d", daysAgo(90), daysAgo(31)),
            )

        val regularResult = PredictionEngine.predict(regularOnly, config)
        val outlierResult = PredictionEngine.predict(withOutlier, config)

        // The 60-day outlier shifts the prediction only slightly, not by half.
        val shift = kotlin.math.abs(outlierResult.nextPeriodStart.toEpochDay() - regularResult.nextPeriodStart.toEpochDay())
        assertThat(shift).isLessThan(7)
        assertThat(outlierResult.cyclesUsed).isEqualTo(4)
    }

    @Test
    fun `regular histories are more confident than irregular ones of equal length`() {
        val regular =
            listOf(
                PredictionEngine.CycleInput("a", daysAgo(84), daysAgo(57)),
                PredictionEngine.CycleInput("b", daysAgo(56), daysAgo(29)),
                PredictionEngine.CycleInput("c", daysAgo(28), daysAgo(1)),
            )
        val irregular =
            listOf(
                PredictionEngine.CycleInput("a", daysAgo(84), daysAgo(50)),
                PredictionEngine.CycleInput("b", daysAgo(49), daysAgo(21)),
                PredictionEngine.CycleInput("c", daysAgo(20), daysAgo(1)),
            )

        val regularConfidence = PredictionEngine.predict(regular, config).confidence
        val irregularConfidence = PredictionEngine.predict(irregular, config).confidence

        assertThat(regularConfidence).isGreaterThan(irregularConfidence)
    }

    @Test
    fun `uncertainty window brackets the predicted start symmetrically`() {
        val cycles =
            listOf(
                PredictionEngine.CycleInput("a", daysAgo(84), daysAgo(56)),
                PredictionEngine.CycleInput("b", daysAgo(55), daysAgo(27)),
                PredictionEngine.CycleInput("c", daysAgo(26), daysAgo(1)),
            )

        val result = PredictionEngine.predict(cycles, config)

        val before = ChronoUnit.DAYS.between(result.uncertaintyStart, result.nextPeriodStart)
        val after = ChronoUnit.DAYS.between(result.nextPeriodStart, result.uncertaintyEnd)
        assertThat(before).isEqualTo(after)
        assertThat(before).isGreaterThan(0)
    }

    @Test
    fun `ovulation is lutealPhaseLength days before predicted period`() {
        val cycles = listOf(PredictionEngine.CycleInput("a", daysAgo(10), null))

        val result = PredictionEngine.predict(cycles, config)

        val diff = result.nextPeriodStart.toEpochDay() - result.ovulationDay.toEpochDay()
        assertThat(diff).isEqualTo(14)
    }

    @Test
    fun `fertile window is 3 days before and 1 day after ovulation`() {
        val cycles = listOf(PredictionEngine.CycleInput("a", daysAgo(10), null))

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
    fun `phase derives boundaries from config instead of hardcoded days`() {
        val custom =
            PredictionEngine.Config(
                avgCycleLength = 35,
                avgPeriodLength = 7,
                lutealPhaseLength = 12,
            )

        // Approaching next period within the configured period length.
        assertThat(PredictionEngine.phase(5, custom)).isEqualTo("menstrual")
        // Early in the current cycle (day 7 of 35).
        assertThat(PredictionEngine.phase(28, custom)).isEqualTo("menstrual")
        // Day 8..19: follicular (ovulation on day 23, window starts day 20).
        assertThat(PredictionEngine.phase(27, custom)).isEqualTo("follicular")
        assertThat(PredictionEngine.phase(16, custom)).isEqualTo("follicular")
        // Days 20..24: ovulation window.
        assertThat(PredictionEngine.phase(15, custom)).isEqualTo("ovulation")
        assertThat(PredictionEngine.phase(11, custom)).isEqualTo("ovulation")
        // After the window: luteal.
        assertThat(PredictionEngine.phase(10, custom)).isEqualTo("luteal")
    }
}
