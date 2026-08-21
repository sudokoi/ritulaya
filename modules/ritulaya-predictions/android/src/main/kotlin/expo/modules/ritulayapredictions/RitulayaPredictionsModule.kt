package expo.modules.ritulayapredictions

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject
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

                val today = LocalDate.now()
                val currentCycle = engineCycles.firstOrNull { it.endDate == null }
                val dayNumber =
                    currentCycle
                        ?.let { (ChronoUnit.DAYS.between(LocalDate.parse(it.startDate), today) + 1).toInt() }
                        ?: 1
                val daysUntilNext = ChronoUnit.DAYS.between(today, output.nextPeriodStart).toInt()
                val phase = PredictionEngine.phase(daysUntilNext, engineConfig)

                val result =
                    mapOf(
                        "prediction" to output.toMap(),
                        "periodLength" to periodLength,
                        "avgCycleLength" to avgCycleLength,
                        "phase" to phase,
                    )

                persistWidgetSnapshot(dayNumber, phase, daysUntilNext)
                result
            }
        }

    /**
     * Persists a small widget-facing snapshot so the home-screen widget renders
     * exactly what the app computed instead of re-running its own copy of the
     * prediction pipeline.
     */
    private fun persistWidgetSnapshot(
        dayNumber: Int,
        phase: String,
        daysUntilNext: Int,
    ) {
        val context: Context = appContext.reactContext?.applicationContext ?: return
        context
            .getSharedPreferences("ritulaya_predictions", Context.MODE_PRIVATE)
            .edit()
            .putString(
                "widget_snapshot",
                JSONObject()
                    .put("dayNumber", dayNumber)
                    .put("phase", phase)
                    .put("daysUntilNext", daysUntilNext)
                    .toString(),
            ).apply()
    }
}
