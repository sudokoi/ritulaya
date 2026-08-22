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
                copy: WidgetCopyRecord,
                ->
                val engineCycles = cycles.map { PredictionEngine.CycleInput(it.id, it.startDate, it.endDate) }
                val engineLogs = logs.map { PredictionEngine.DayLogInput(it.date, it.cycleId, it.flowIntensity) }
                val engineConfig = PredictionEngine.Config(config.avgCycleLength, config.avgPeriodLength, config.lutealPhaseLength)

                val periodLength = PredictionEngine.averagePeriodLength(engineCycles, engineLogs, engineConfig.avgPeriodLength)
                val avgCycleLength = PredictionEngine.averageCycleLength(engineCycles, engineConfig.avgCycleLength)
                val output = PredictionEngine.predict(engineCycles, engineConfig.copy(avgPeriodLength = periodLength))

                val today = LocalDate.now()
                val currentCycle = engineCycles.firstOrNull { it.endDate == null }
                val daysUntilNext = ChronoUnit.DAYS.between(today, output.nextPeriodStart).toInt()
                val phase = PredictionEngine.phase(daysUntilNext, engineConfig)

                val result =
                    mapOf(
                        "prediction" to output.toMap(),
                        "periodLength" to periodLength,
                        "avgCycleLength" to avgCycleLength,
                        "phase" to phase,
                        "stats" to
                            PredictionEngine.cycleStats(engineCycles)?.let { stats ->
                                mapOf(
                                    "lengths" to stats.lengths,
                                    "median" to stats.median,
                                    "sigma" to stats.sigma,
                                )
                            },
                    )

                persistWidgetSnapshot(output.nextPeriodStart, currentCycle?.startDate, engineConfig, config.dataVersion, copy)
                result
            }
        }

    /**
     * Persists a widget-facing snapshot so the home-screen widget renders
     * exactly what the app computed instead of re-running its own copy of the
     * prediction pipeline. Dates are stored rather than derived counters so
     * the widget stays current across reboots without an app-side recompute;
     * localized display strings ride along so the translation files stay the
     * only source of widget copy.
     */
    private fun persistWidgetSnapshot(
        nextPeriodStart: LocalDate,
        cycleStartDate: String?,
        config: PredictionEngine.Config,
        dataVersion: String,
        copy: WidgetCopyRecord,
    ) {
        val context: Context = appContext.reactContext?.applicationContext ?: return
        context
            .getSharedPreferences("ritulaya_predictions", Context.MODE_PRIVATE)
            .edit()
            .putString(
                "widget_snapshot",
                JSONObject()
                    .put("nextPeriodStart", nextPeriodStart.toString())
                    .put("cycleStartDate", cycleStartDate ?: "")
                    .put("avgCycleLength", config.avgCycleLength)
                    .put("avgPeriodLength", config.avgPeriodLength)
                    .put("lutealPhaseLength", config.lutealPhaseLength)
                    .put("dataVersion", dataVersion)
                    .put(
                        "copy",
                        JSONObject()
                            .put("menstrual", copy.menstrual)
                            .put("follicular", copy.follicular)
                            .put("ovulation", copy.ovulation)
                            .put("luteal", copy.luteal)
                            .put("today", copy.today)
                            .put("dayUntilSingular", copy.dayUntilSingular)
                            .put("daysUntilMany", copy.daysUntilMany),
                    ).toString(),
            ).apply()
    }
}
