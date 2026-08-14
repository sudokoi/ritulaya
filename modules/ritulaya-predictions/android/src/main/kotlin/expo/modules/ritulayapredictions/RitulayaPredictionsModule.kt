package expo.modules.ritulayapredictions

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.time.LocalDate
import java.time.temporal.ChronoUnit

class RitulayaPredictionsModule : Module() {
    override fun definition() =
        ModuleDefinition {
            Name("RitulayaPredictions")

            AsyncFunction("predict") {
                cycles: List<CycleInputRecord>,
                logs: List<DayLogInputRecord>,
                config: PredictionConfigRecord,
                ->
                val engineCycles = cycles.map { PredictionEngine.CycleInput(it.id, it.startDate, it.endDate) }
                val engineLogs = logs.map { PredictionEngine.DayLogInput(it.date, it.cycleId, it.flowIntensity) }
                val engineConfig = PredictionEngine.Config(config.avgCycleLength, config.avgPeriodLength, config.lutealPhaseLength)

                val periodLength = PredictionEngine.averagePeriodLength(engineCycles, engineLogs, engineConfig.avgPeriodLength)
                val avgCycleLength = PredictionEngine.averageCycleLength(engineCycles, engineConfig.avgCycleLength)
                val output = PredictionEngine.predict(engineCycles, engineConfig.copy(avgPeriodLength = periodLength))

                val daysUntilNext = ChronoUnit.DAYS.between(LocalDate.now(), output.nextPeriodStart).toInt()
                val phase = PredictionEngine.phase(daysUntilNext, engineConfig.avgCycleLength)

                mapOf(
                    "prediction" to output.toMap(),
                    "periodLength" to periodLength,
                    "avgCycleLength" to avgCycleLength,
                    "phase" to phase,
                )
            }
        }
}
