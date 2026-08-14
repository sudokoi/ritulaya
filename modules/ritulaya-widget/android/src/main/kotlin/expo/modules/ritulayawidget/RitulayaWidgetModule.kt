package expo.modules.ritulayawidget

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class RitulayaWidgetModule : Module() {
    override fun definition() =
        ModuleDefinition {
            Name("RitulayaWidget")

            AsyncFunction("updateWidget") { dayNumber: Int, phaseName: String, daysUntilNext: Int, discreetMode: Boolean ->
                val ctx =
                    appContext.reactContext?.applicationContext
                        ?: return@AsyncFunction

                val prefs = ctx.getSharedPreferences("ritulaya_widget", Context.MODE_PRIVATE)
                prefs
                    .edit()
                    .putInt("day_number", dayNumber)
                    .putString("phase_name", phaseName)
                    .putInt("days_until_next", daysUntilNext)
                    .putBoolean("discreet_mode", discreetMode)
                    .apply()

                RitulayaWidgetProvider.refresh(ctx)
            }
        }
}
