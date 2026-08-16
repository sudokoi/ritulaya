package expo.modules.ritulayapredictions

import java.time.LocalDate
import java.time.temporal.ChronoUnit

object PredictionEngine {
    data class CycleInput(
        val id: String,
        val startDate: String,
        val endDate: String?,
    )

    data class DayLogInput(
        val date: String,
        val cycleId: String?,
        val flowIntensity: String?,
    )

    data class Config(
        val avgCycleLength: Int,
        val avgPeriodLength: Int,
        val lutealPhaseLength: Int,
    )

    data class Output(
        val nextPeriodStart: LocalDate,
        val nextPeriodEnd: LocalDate,
        val ovulationDay: LocalDate,
        val fertileWindowStart: LocalDate,
        val fertileWindowEnd: LocalDate,
        val confidence: Double,
        val cyclesUsed: Int,
        val engine: String,
    )

    fun averagePeriodLength(
        cycles: List<CycleInput>,
        logs: List<DayLogInput>,
        fallback: Int,
    ): Int {
        val lengths = mutableListOf<Int>()
        for (cycle in cycles) {
            if (cycle.endDate == null) continue
            val flowDates =
                logs
                    .filter {
                        it.cycleId == cycle.id &&
                            !it.flowIntensity.isNullOrBlank() &&
                            it.flowIntensity != "none"
                    }.map { it.date }
                    .sorted()
            if (flowDates.isEmpty()) continue
            val first = LocalDate.parse(flowDates.first())
            val last = LocalDate.parse(flowDates.last())
            lengths.add(ChronoUnit.DAYS.between(first, last).toInt() + 1)
        }

        if (lengths.isEmpty()) return fallback

        val total = lengths.mapIndexed { index, length -> length.toDouble() / (index + 1) }.sum()
        val weight = lengths.indices.sumOf { 1.0 / (it + 1) }
        return Math.round(total / weight).toInt()
    }

    fun averageCycleLength(
        cycles: List<CycleInput>,
        fallback: Int,
    ): Int {
        val completed = cycles.filter { it.endDate != null }
        if (completed.isEmpty()) return fallback

        val total =
            completed.sumOf { cycle ->
                val start = LocalDate.parse(cycle.startDate)
                val end = LocalDate.parse(cycle.endDate ?: cycle.startDate)
                ChronoUnit.DAYS.between(start, end).toInt() + 1
            }
        return Math.round(total.toDouble() / completed.size).toInt()
    }

    fun phase(
        daysUntilNext: Int,
        avgCycleLength: Int,
    ): String {
        if (daysUntilNext <= 5) return "menstrual"
        val dayInCycle = avgCycleLength - daysUntilNext
        if (dayInCycle <= 5) return "menstrual"
        if (dayInCycle <= 13) return "follicular"
        if (dayInCycle <= 15) return "ovulation"
        return "luteal"
    }

    fun predict(
        cycles: List<CycleInput>,
        config: Config,
    ): Output {
        val all =
            cycles
                .sortedByDescending { it.startDate }

        if (all.isEmpty()) return populationFallback(config)

        val completed = all.filter { it.endDate != null }

        val cycleLengths =
            completed.map { cycle ->
                val start = LocalDate.parse(cycle.startDate)
                val end = LocalDate.parse(cycle.endDate ?: cycle.startDate)
                ChronoUnit.DAYS.between(start, end).toInt() + 1
            }

        val avgCycleLength =
            if (cycleLengths.size >= 2) {
                weightedMovingAverage(cycleLengths, config.avgCycleLength, cycleLengths.size)
            } else {
                config.avgCycleLength
            }

        val baseStart = LocalDate.parse(all.first().startDate)
        val rawNextStart = baseStart.plusDays(avgCycleLength.toLong())
        val overdue = rawNextStart.isBefore(LocalDate.now())
        val nextStart = if (overdue) LocalDate.now() else rawNextStart
        val nextEnd = nextStart.plusDays(config.avgPeriodLength.toLong() - 1)
        val ovulationAnchor = if (overdue) nextStart.plusDays(avgCycleLength.toLong()) else nextStart
        val ovulation = ovulationAnchor.minusDays(config.lutealPhaseLength.toLong())
        val fertileStart = ovulation.minusDays(3)
        val fertileEnd = ovulation.plusDays(1)

        return Output(
            nextPeriodStart = nextStart,
            nextPeriodEnd = nextEnd,
            ovulationDay = ovulation,
            fertileWindowStart = fertileStart,
            fertileWindowEnd = fertileEnd,
            confidence = confidenceScore(cycleLengths.size),
            cyclesUsed = cycleLengths.size,
            engine = "wma",
        )
    }

    private fun weightedMovingAverage(
        lengths: List<Int>,
        fallback: Int,
        count: Int,
    ): Int {
        if (count < 2) return fallback

        val weights: List<Double> =
            when (count) {
                2 -> {
                    listOf(0.6, 0.4)
                }

                3 -> {
                    listOf(0.5, 0.3, 0.2)
                }

                else -> {
                    val raw = (0 until count).map { 1.0 / (it + 1) }
                    val total = raw.sum()
                    raw.map { it / total }
                }
            }

        var sum = 0.0
        for (i in 0 until minOf(lengths.size, weights.size)) {
            sum += lengths[i] * weights[i]
        }
        return Math.round(sum).toInt()
    }

    private fun confidenceScore(count: Int): Double =
        when {
            count >= 6 -> 0.95
            count >= 4 -> 0.85
            count >= 3 -> 0.7
            count >= 2 -> 0.5
            else -> 0.3
        }

    private fun populationFallback(config: Config): Output {
        val today = LocalDate.now()
        val nextStart = today.plusDays(config.avgCycleLength.toLong() - 1)
        val nextEnd = nextStart.plusDays(config.avgPeriodLength.toLong() - 1)
        val ovulation = nextStart.minusDays(config.lutealPhaseLength.toLong())
        val fertileStart = ovulation.minusDays(3)
        val fertileEnd = ovulation.plusDays(1)
        return Output(
            nextPeriodStart = nextStart,
            nextPeriodEnd = nextEnd,
            ovulationDay = ovulation,
            fertileWindowStart = fertileStart,
            fertileWindowEnd = fertileEnd,
            confidence = 0.3,
            cyclesUsed = 0,
            engine = "wma",
        )
    }
}
