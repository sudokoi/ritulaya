package expo.modules.ritulayapredictions

import java.time.LocalDate
import java.time.temporal.ChronoUnit

object PredictionEngine {
    // A last logged period older than this means history no longer reflects
    // the user's current pattern; predictions reset to population defaults.
    private const val FRESHNESS_LIMIT_DAYS = 90L

    // Interval multiplier for an ~80% prediction window (±1.28σ).
    private const val INTERVAL_SIGMA = 1.28

    // Dispersion floor used for the uncertainty window when there is too
    // little history to estimate spread from the user's own data.
    private const val FALLBACK_SIGMA_DAYS = 2.0

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
        val uncertaintyStart: LocalDate,
        val uncertaintyEnd: LocalDate,
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
        config: Config,
    ): String {
        val ovulationDay = config.avgCycleLength - config.lutealPhaseLength
        val dayInCycle = config.avgCycleLength - daysUntilNext
        return when {
            daysUntilNext <= config.avgPeriodLength -> "menstrual"
            dayInCycle <= config.avgPeriodLength -> "menstrual"
            dayInCycle < ovulationDay - 3 -> "follicular"
            dayInCycle <= ovulationDay + 1 -> "ovulation"
            else -> "luteal"
        }
    }

    fun predict(
        cycles: List<CycleInput>,
        config: Config,
    ): Output {
        val all =
            cycles
                .sortedByDescending { it.startDate }

        if (all.isEmpty()) return populationFallback(config)

        val today = LocalDate.now()

        // Stale history no longer describes the current pattern; start fresh.
        val latestStart = LocalDate.parse(all.first().startDate)
        if (ChronoUnit.DAYS.between(latestStart, today) > FRESHNESS_LIMIT_DAYS) {
            return populationFallback(config)
        }

        val completed = all.filter { it.endDate != null }

        val cycleLengths =
            completed.map { cycle ->
                val start = LocalDate.parse(cycle.startDate)
                val end = LocalDate.parse(cycle.endDate ?: cycle.startDate)
                ChronoUnit.DAYS.between(start, end).toInt() + 1
            }

        val avgCycleLength =
            if (cycleLengths.size >= 2) {
                similarityWeightedAverage(cycleLengths, config.avgCycleLength)
            } else {
                config.avgCycleLength
            }

        val sigma =
            if (cycleLengths.size >= 2) robustSigma(cycleLengths) else FALLBACK_SIGMA_DAYS
        val intervalDays = Math.round(INTERVAL_SIGMA * sigma).toInt()

        val rawNextStart = baseStart(all).plusDays(avgCycleLength.toLong())
        val overdue = rawNextStart.isBefore(today)
        val nextStart = if (overdue) today else rawNextStart
        val nextEnd = nextStart.plusDays(config.avgPeriodLength.toLong() - 1)
        // Ovulation is always anchored to the predicted period start; when the
        // period is overdue this places ovulation (and the fertile window) in
        // the past, which is correct — it already happened last cycle.
        val ovulation = nextStart.minusDays(config.lutealPhaseLength.toLong())
        val fertileStart = ovulation.minusDays(3)
        val fertileEnd = ovulation.plusDays(1)

        return Output(
            nextPeriodStart = nextStart,
            nextPeriodEnd = nextEnd,
            ovulationDay = ovulation,
            fertileWindowStart = fertileStart,
            fertileWindowEnd = fertileEnd,
            uncertaintyStart = nextStart.minusDays(intervalDays.toLong()),
            uncertaintyEnd = nextStart.plusDays(intervalDays.toLong()),
            confidence = confidenceScore(cycleLengths),
            cyclesUsed = cycleLengths.size,
            engine = "wma",
        )
    }

    /**
     * Recency-weighted average where each cycle additionally loses weight the
     * farther it sits from the user's own typical length (median). Spread is
     * estimated with the median absolute deviation, so everything comes from
     * the user's history — no population heuristics, nothing discarded.
     */
    private fun similarityWeightedAverage(
        lengths: List<Int>,
        fallback: Int,
    ): Int {
        if (lengths.size < 2) return fallback

        val recency = recencyWeights(lengths.size)
        var weightedSum = 0.0
        var totalWeight = 0.0
        for (i in lengths.indices) {
            val w = recency[i] * similarityWeight(lengths[i], lengths)
            weightedSum += lengths[i] * w
            totalWeight += w
        }
        if (totalWeight <= 0.0) return fallback
        return Math.round(weightedSum / totalWeight).toInt()
    }

    private fun similarityWeight(
        length: Int,
        lengths: List<Int>,
    ): Double {
        val sigma = robustSigma(lengths)
        val delta = length - median(lengths)
        return kotlin.math.exp(-(delta * delta) / (2 * sigma * sigma))
    }

    private fun recencyWeights(count: Int): List<Double> =
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

    private fun median(lengths: List<Int>): Double {
        val sorted = lengths.sorted()
        val mid = sorted.size / 2
        return if (sorted.size % 2 == 0) (sorted[mid - 1] + sorted[mid]) / 2.0 else sorted[mid].toDouble()
    }

    /** Median absolute deviation scaled to be comparable to a standard deviation. */
    private fun robustSigma(lengths: List<Int>): Double {
        val med = median(lengths)
        val deviations = lengths.map { kotlin.math.abs(it - med) }.sorted()
        val mid = deviations.size / 2
        val mad =
            if (deviations.size % 2 == 0) {
                (deviations[mid - 1] + deviations[mid]) / 2.0
            } else {
                deviations[mid].toDouble()
            }
        // Floor at 2 days so near-identical histories don't collapse the
        // kernel into erasing ordinary variation entirely.
        return maxOf(1.4826 * mad, 2.0)
    }

    private fun baseStart(all: List<CycleInput>): LocalDate = LocalDate.parse(all.first().startDate)

    /**
     * Confidence combines how much history exists with how regular that
     * history is (coefficient of variation based on the user's own median and
     * spread). Regularity floors at 0.3 so chaotic data never scores high no
     * matter how much of it there is.
     */
    private fun confidenceScore(cycleLengths: List<Int>): Double {
        val volumeFactor =
            when {
                cycleLengths.size >= 6 -> 0.95
                cycleLengths.size >= 4 -> 0.85
                cycleLengths.size >= 3 -> 0.7
                cycleLengths.size >= 2 -> 0.5
                else -> 0.3
            }

        if (cycleLengths.size < 2) return volumeFactor

        val med = median(cycleLengths)
        if (med <= 0.0) return volumeFactor
        val cv = robustSigma(cycleLengths) / med
        val regularityFactor = (1.0 - cv / 0.25).coerceIn(0.3, 1.0)
        return volumeFactor * regularityFactor
    }

    private fun populationFallback(config: Config): Output {
        val today = LocalDate.now()
        val nextStart = today.plusDays(config.avgCycleLength.toLong() - 1)
        val nextEnd = nextStart.plusDays(config.avgPeriodLength.toLong() - 1)
        val ovulation = nextStart.minusDays(config.lutealPhaseLength.toLong())
        val fertileStart = ovulation.minusDays(3)
        val fertileEnd = ovulation.plusDays(1)
        val intervalDays = Math.round(INTERVAL_SIGMA * FALLBACK_SIGMA_DAYS).toInt()
        return Output(
            nextPeriodStart = nextStart,
            nextPeriodEnd = nextEnd,
            ovulationDay = ovulation,
            fertileWindowStart = fertileStart,
            fertileWindowEnd = fertileEnd,
            uncertaintyStart = nextStart.minusDays(intervalDays.toLong()),
            uncertaintyEnd = nextStart.plusDays(intervalDays.toLong()),
            confidence = 0.3,
            cyclesUsed = 0,
            engine = "wma",
        )
    }
}
