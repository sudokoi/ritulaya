package expo.modules.ritulayadb

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

            AsyncFunction("listCycles") {
                runBlocking { store.listCycles().map { it.toMap() } }
            }

            AsyncFunction("createCycle") { startDate: String ->
                runBlocking { store.createCycle(startDate).toMap() }
            }

            AsyncFunction("logPeriod") { flow: String, periodDays: Int ->
                runBlocking { store.logPeriod(flow, periodDays) }
            }

            AsyncFunction("logPeriodOn") { date: String, flow: String, periodDays: Int ->
                runBlocking { store.logPeriodOn(date, flow, periodDays) }
            }

            AsyncFunction("endCycle") { id: String, endDate: String ->
                runBlocking { store.endCycle(id, endDate) }
            }

            AsyncFunction("listDayLogs") {
                runBlocking { store.listDayLogs().map { it.toMap() } }
            }

            AsyncFunction("findLastFlowDate") {
                runBlocking { store.findLastFlowDate() }
            }

            AsyncFunction("upsertDayLog") { input: DayLogInput ->
                runBlocking { store.upsertDayLog(input).toMap() }
            }

            AsyncFunction("deleteDayLog") { id: String ->
                runBlocking { store.deleteDayLog(id) }
            }

            AsyncFunction("getSettings") {
                runBlocking { store.getSettings()?.toMap() }
            }

            AsyncFunction("updateSettings") { patch: SettingsPatch ->
                runBlocking { store.updateSettings(patch) }
            }
        }
}
