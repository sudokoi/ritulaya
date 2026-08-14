package expo.modules.ritulayawidget

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class RitulayaWidgetModule : Module() {
    override fun definition() =
        ModuleDefinition {
            Name("RitulayaWidget")

            AsyncFunction("refreshWidget") {
                val ctx = appContext.reactContext?.applicationContext
                if (ctx != null) {
                    RitulayaWidgetProvider.refresh(ctx)
                }
            }
        }
}
