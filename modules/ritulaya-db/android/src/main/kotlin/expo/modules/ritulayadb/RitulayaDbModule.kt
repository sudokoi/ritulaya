package expo.modules.ritulayadb

import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.runBlocking

class RitulayaDbModule : Module() {
    private lateinit var store: RitulayaDataStore

    override fun definition() =
        ModuleDefinition {
            Name("RitulayaDb")

            OnCreate {
                val context =
                    appContext.reactContext?.applicationContext
                        ?: throw IllegalStateException("Application context not available")
                store = RitulayaDataStore(context)
            }

            // No-arg suspend lambdas are ambiguous between the 0-arg and 1-arg
            // Coroutine overloads, so these keep runBlocking (still off the JS thread).
            AsyncFunction("listCycles") {
                runBlocking { store.listCycles().map { it.toMap() } }
            }

            AsyncFunction("logPeriod") Coroutine { flow: String, periodDays: Int ->
                store.logPeriod(flow, periodDays)
            }

            AsyncFunction("logPeriodOn") Coroutine { date: String, flow: String, periodDays: Int ->
                store.logPeriodOn(date, flow, periodDays)
            }

            AsyncFunction("listDayLogs") {
                runBlocking { store.listDayLogs().map { it.toMap() } }
            }

            AsyncFunction("upsertDayLog") Coroutine { input: DayLogInput ->
                store.upsertDayLog(input).toMap()
            }

            AsyncFunction("deleteDayLog") Coroutine { id: String ->
                store.deleteDayLog(id)
            }

            AsyncFunction("getSettings") {
                runBlocking { store.getSettings()?.toMap() }
            }

            AsyncFunction("latestDataChange") {
                runBlocking { store.latestDataChange() }
            }

            AsyncFunction("updateSettings") Coroutine { patch: SettingsPatch ->
                store.updateSettings(patch)
            }
        }
}
