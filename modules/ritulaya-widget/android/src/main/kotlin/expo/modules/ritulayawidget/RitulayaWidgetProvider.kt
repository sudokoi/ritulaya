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
            val store = RitulayaDataStore(context.applicationContext)
            val settings = store.getSettings()
            val discreet = settings?.discreetMode == 1

            // Prefer the snapshot the app persisted with its last prediction so
            // the widget always matches what the user sees in-app; counters are
            // derived from the stored dates at render time so they stay current
            // across reboots. A snapshot whose recorded data version no longer
            // matches the database (e.g. a background sync merged newer cycles
            // while the app was closed) is ignored so the render falls back to
            // computing locally from live rows.
            val snapshot = readSnapshot(context)
            val dataVersion = store.latestDataChange()
            val copy = snapshot?.copy ?: WidgetCopy.fallback()
            if (snapshot != null && snapshot.dataVersion == (dataVersion ?: "")) {
                val today = LocalDate.now()
                val dayNumber =
                    snapshot.cycleStartDate
                        ?.let { (ChronoUnit.DAYS.between(LocalDate.parse(it), today) + 1).toInt() }
                        ?: 0
                val daysUntilNext = ChronoUnit.DAYS.between(today, snapshot.nextPeriodStart).toInt()
                val phase =
                    PredictionEngine.phase(
                        daysUntilNext,
                        PredictionEngine.Config(
                            snapshot.avgCycleLength,
                            snapshot.avgPeriodLength,
                            snapshot.lutealPhaseLength,
                        ),
                    )
                render(context, appWidgetManager, widgetId, dayNumber, phase, daysUntilNext, discreet, copy)
                return
            }

            val cycles = store.listCycles().map { PredictionEngine.CycleInput(it.id, it.startDate, it.endDate) }
            val logs = store.listDayLogs().map { PredictionEngine.DayLogInput(it.date, it.cycleId, it.flowIntensity) }
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
                    ?: 0
            val daysUntilNext = ChronoUnit.DAYS.between(today, output.nextPeriodStart).toInt()
            val phase = PredictionEngine.phase(daysUntilNext, config)

            render(context, appWidgetManager, widgetId, dayNumber, phase, daysUntilNext, discreet, copy)
        }

        private data class WidgetSnapshot(
            val nextPeriodStart: LocalDate,
            val cycleStartDate: String?,
            val avgCycleLength: Int,
            val avgPeriodLength: Int,
            val lutealPhaseLength: Int,
            val dataVersion: String,
            /** Localized display strings captured by the app; null in old snapshots. */
            val copy: WidgetCopy?,
        )

        private fun readSnapshot(context: Context): WidgetSnapshot? {
            val prefs = context.getSharedPreferences("ritulaya_predictions", Context.MODE_PRIVATE)
            val json = prefs.getString("widget_snapshot", null) ?: return null
            return try {
                val o = org.json.JSONObject(json)
                WidgetSnapshot(
                    nextPeriodStart = LocalDate.parse(o.getString("nextPeriodStart")),
                    cycleStartDate = o.getString("cycleStartDate").ifEmpty { null },
                    avgCycleLength = o.getInt("avgCycleLength"),
                    avgPeriodLength = o.getInt("avgPeriodLength"),
                    lutealPhaseLength = o.getInt("lutealPhaseLength"),
                    dataVersion = o.optString("dataVersion"),
                    copy = readCopy(o.optJSONObject("copy")),
                )
            } catch (_: Exception) {
                null
            }
        }

        private fun readCopy(o: org.json.JSONObject?): WidgetCopy? {
            if (o == null) return null
            return try {
                WidgetCopy(
                    phases =
                        mapOf(
                            "menstrual" to o.getString("menstrual"),
                            "follicular" to o.getString("follicular"),
                            "ovulation" to o.getString("ovulation"),
                            "luteal" to o.getString("luteal"),
                        ),
                    today = o.getString("today"),
                    daysUntilTemplate = o.getString("daysUntilMany"),
                    dayUntilSingular = o.getString("dayUntilSingular"),
                )
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
            rawDaysUntilNext: Int,
            discreetMode: Boolean,
            copy: WidgetCopy,
        ) {
            // The widget only re-renders when the app refreshes it; if the
            // stored next period passes in the meantime, show 0 rather than
            // a negative countdown.
            val daysUntilNext = maxOf(0, rawDaysUntilNext)
            // Missing or future cycle starts cannot anchor a day or countdown.
            val hasCurrentCycle = dayNumber > 0
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
                if (hasCurrentCycle) dayNumber.toString() else "",
            )
            views.setTextViewText(
                context.resources.getIdentifier("phase_name", "id", context.packageName),
                if (discreetMode || !hasCurrentCycle) copy.today else copy.phase(phase),
            )
            views.setTextViewText(
                context.resources.getIdentifier("days_until", "id", context.packageName),
                when {
                    !hasCurrentCycle -> ""
                    discreetMode -> "$daysUntilNext"
                    else -> copy.daysUntil(daysUntilNext)
                },
            )

            // Deep-link straight into the log-today flow via the app's
            // expo-router scheme; falls back to a plain launch.
            val launchIntent =
                context.packageManager
                    .getLaunchIntentForPackage(context.packageName)
                    ?.apply {
                        action = android.content.Intent.ACTION_VIEW
                        data = android.net.Uri.parse("ritulaya://log-today")
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
