package expo.modules.ritulayawidget

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class RitulayaWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("RitulayaWidget")

    AsyncFunction("updateWidget") {
      dayNumber: Int, phaseName: String, daysUntilNext: Int, discreetMode: Boolean ->
      // TODO: Update SharedPreferences, trigger AppWidgetProvider refresh
    }
  }
}
