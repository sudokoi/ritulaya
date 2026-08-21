package expo.modules.ritulayawidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import expo.modules.ritulayadb.RitulayaDataStore
import expo.modules.ritulayapredictions.PredictionEngine
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.temporal.ChronoUnit

class RitulayaWidgetProvider : AppWidgetProvider() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        val pending = goAsync()
        scope.launch {
            try {
                for (widgetId in appWidgetIds) {
                    updateWidget(context, appWidgetManager, widgetId)
                }
            } catch (_: Exception) {
                // Best-effort: leave existing widget content on failure.
            } finally {
                pending.finish()
            }
        }
    }

    companion object {
        fun refresh(context: Context) {
            val intent = Intent(context, RitulayaWidgetProvider::class.java)
            intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            val ids =
                AppWidgetManager
                    .getInstance(context)
                    .getAppWidgetIds(ComponentName(context, RitulayaWidgetProvider::class.java))
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            context.sendBroadcast(intent)
        }

        private suspend fun updateWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            widgetId: Int,
        ) {
            val discreet = RitulayaDataStore(context.applicationContext).getSettings()?.discreetMode == 1

            // Prefer the snapshot the app persisted with its last prediction so
            // the widget always matches what the user sees in-app; fall back to
            // computing locally (fresh install before the first app launch).
            val snapshot = readSnapshot(context)
            if (snapshot != null) {
                render(
                    context,
                    appWidgetManager,
                    widgetId,
                    snapshot.dayNumber,
                    snapshot.phase,
                    snapshot.daysUntilNext,
                    discreet,
                )
                return
            }

            val store = RitulayaDataStore(context.applicationContext)
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
            val output = PredictionEngine.predict(cycles, config.copy(avgPeriodLength = periodLength))

            val today = LocalDate.now()
            val currentCycle = cycles.firstOrNull { it.endDate == null }
            val dayNumber =
                currentCycle
                    ?.let { (ChronoUnit.DAYS.between(LocalDate.parse(it.startDate), today) + 1).toInt() }
                    ?: 1
            val daysUntilNext = ChronoUnit.DAYS.between(today, output.nextPeriodStart).toInt()
            val phase = PredictionEngine.phase(daysUntilNext, config)

            render(context, appWidgetManager, widgetId, dayNumber, phase, daysUntilNext, discreet)
        }

        private data class WidgetSnapshot(
            val dayNumber: Int,
            val phase: String,
            val daysUntilNext: Int,
        )

        private fun readSnapshot(context: Context): WidgetSnapshot? {
            val prefs = context.getSharedPreferences("ritulaya_predictions", Context.MODE_PRIVATE)
            val json = prefs.getString("widget_snapshot", null) ?: return null
            return try {
                val o = org.json.JSONObject(json)
                WidgetSnapshot(o.getInt("dayNumber"), o.getString("phase"), o.getInt("daysUntilNext"))
            } catch (_: Exception) {
                null
            }
        }

        private fun render(
            context: Context,
            appWidgetManager: AppWidgetManager,
            widgetId: Int,
            dayNumber: Int,
            phase: String,
            daysUntilNext: Int,
            discreetMode: Boolean,
        ) {
            val layoutId =
                if (discreetMode) {
                    context.resources.getIdentifier(
                        "ritulaya_widget_discreet",
                        "layout",
                        context.packageName,
                    )
                } else {
                    context.resources.getIdentifier(
                        "ritulaya_widget",
                        "layout",
                        context.packageName,
                    )
                }

            val views = RemoteViews(context.packageName, layoutId)
            views.setTextViewText(
                context.resources.getIdentifier("day_number", "id", context.packageName),
                dayNumber.toString(),
            )
            views.setTextViewText(
                context.resources.getIdentifier("phase_name", "id", context.packageName),
                if (discreetMode) "Today" else phase,
            )
            views.setTextViewText(
                context.resources.getIdentifier("days_until", "id", context.packageName),
                if (discreetMode) "$daysUntilNext" else "$daysUntilNext days until next",
            )

            val launchIntent =
                context.packageManager
                    .getLaunchIntentForPackage(context.packageName)
                    ?.apply {
                        putExtra("widget_launch", true)
                    }
            val pendingIntent =
                PendingIntent.getActivity(
                    context,
                    0,
                    launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )
            views.setOnClickPendingIntent(
                context.resources.getIdentifier("widget_root", "id", context.packageName),
                pendingIntent,
            )

            appWidgetManager.updateAppWidget(widgetId, views)
        }
    }
}
