package expo.modules.ritulayawidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.widget.RemoteViews

class RitulayaWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (widgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    companion object {
        fun refresh(context: Context) {
            val intent = Intent(context, RitulayaWidgetProvider::class.java)
            intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            val ids = AppWidgetManager.getInstance(context)
                .getAppWidgetIds(ComponentName(context, RitulayaWidgetProvider::class.java))
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            context.sendBroadcast(intent)
        }

        private fun updateWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            widgetId: Int
        ) {
            val prefs = context.getSharedPreferences("ritulaya_widget", Context.MODE_PRIVATE)
            val dayNumber = prefs.getInt("day_number", 1)
            val phaseName = prefs.getString("phase_name", "Follicular") ?: "Follicular"
            val daysUntilNext = prefs.getInt("days_until_next", 0)
            val discreetMode = prefs.getBoolean("discreet_mode", false)

            val layoutId = if (discreetMode) {
                context.resources.getIdentifier(
                    "ritulaya_widget_discreet",
                    "layout",
                    context.packageName
                )
            } else {
                context.resources.getIdentifier(
                    "ritulaya_widget",
                    "layout",
                    context.packageName
                )
            }

            val views = RemoteViews(context.packageName, layoutId)
            views.setTextViewText(
                context.resources.getIdentifier("day_number", "id", context.packageName),
                dayNumber.toString()
            )
            views.setTextViewText(
                context.resources.getIdentifier("phase_name", "id", context.packageName),
                if (discreetMode) "Today" else phaseName
            )
            views.setTextViewText(
                context.resources.getIdentifier("days_until", "id", context.packageName),
                if (discreetMode) "$daysUntilNext" else "$daysUntilNext days until next"
            )

            val launchIntent = context.packageManager
                .getLaunchIntentForPackage(context.packageName)?.apply {
                    putExtra("widget_launch", true)
                }
            val pendingIntent = PendingIntent.getActivity(
                context, 0, launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(
                context.resources.getIdentifier("widget_root", "id", context.packageName),
                pendingIntent
            )

            appWidgetManager.updateAppWidget(widgetId, views)
        }
    }
}
