import { readAppSnapshot } from "@/services/db"
import { computePrediction } from "@/services/predictions"
import { changeLanguage } from "@/i18n"
import { toSettings } from "@/data/settings"
import { dataStore } from "@/stores/data-store"
import { blockReminders, allowReminders } from "@/services/notifications"
import { restoreWidgetDetails } from "@/services/widget"

let inFlight: Promise<void> | null = null
let pending = false

/** Capture once, derive off-store, then publish every cache in one event. */
export function refreshAll(): Promise<void> {
  if (inFlight) {
    pending = true
    return inFlight
  }
  dataStore.send({ type: "beginRefresh" })
  inFlight = (async () => {
    try {
      do {
        pending = false
        const snapshot = await readAppSnapshot()
        const settings = toSettings(snapshot.settings)
        // Remote settings may change too; remove stale scheduled copy before deriving.
        // Preserve valid durable schedules across an interrupted routine refresh.
        const previous = dataStore.getSnapshot().context.settings
        if (
          settings.discreetMode !== previous.discreetMode ||
          settings.reminderDailyLog !== previous.reminderDailyLog ||
          settings.reminderPeriodAhead !== previous.reminderPeriodAhead ||
          settings.language !== previous.language
        ) {
          await blockReminders()
        }
        await changeLanguage(settings.language)
        const prediction = await computePrediction(snapshot.cycles, snapshot.logs, {
          avgCycleLength: settings.avgCycleLength,
          avgPeriodLength: settings.avgPeriodLength,
          lutealPhaseLength: settings.lutealPhaseLength,
          dataVersion: snapshot.dataVersion,
        })
        if (!prediction) throw new Error("Prediction computation did not complete")
        if (pending) continue
        if (dataStore.getSnapshot().context.settingsWrites === 0) {
          await restoreWidgetDetails()
          if (pending) continue
          allowReminders()
        }
        dataStore.send({
          type: "publish",
          snapshot: {
            cycles: snapshot.cycles,
            logs: snapshot.logs,
            settings,
            prediction,
          },
        })
      } while (pending)
    } catch (error) {
      dataStore.send({ type: "refreshFailed" })
      throw error
    } finally {
      inFlight = null
      dataStore.send({ type: "endRefresh" })
    }
  })()
  return inFlight
}
