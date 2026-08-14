package expo.modules.ritulayapredictions

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.ritulayadb.RitulayaDataStore
import kotlinx.coroutines.runBlocking

class RitulayaPredictionsModule : Module() {
    private lateinit var store: RitulayaDataStore

    override fun definition() =
        ModuleDefinition {
            Name("RitulayaPredictions")

            OnCreate {
                val context =
                    appContext.reactContext?.applicationContext
                        ?: throw IllegalStateException("Application context not available")
                store = RitulayaDataStore(context)
            }

            AsyncFunction("predict") {
                runBlocking {
                    val cycles = store.listCycles().map { PredictionEngine.CycleInput(it.id, it.startDate, it.endDate) }
                    val logs = store.listDayLogs().map { PredictionEngine.DayLogInput(it.date, it.cycleId, it.flowIntensity) }
                    val settings = store.getSettings()

                    val config =
                        PredictionEngine.Config(
                            avgCycleLength = settings?.avgCycleLength ?: 28,
                            avgPeriodLength = settings?.avgPeriodLength ?: 3,
                            lutealPhaseLength = settings?.lutealPhaseLength ?: 14,
                        )

                    val periodLength = PredictionEngine.averagePeriodLength(cycles, logs, config.avgPeriodLength)
                    val output = PredictionEngine.predict(cycles, config)

                    mapOf(
                        "prediction" to output.toMap(),
                        "periodLength" to periodLength,
                    )
                }
            }
        }
}
