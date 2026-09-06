package expo.modules.ritulayawidget

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class RitulayaWidgetModule : Module() {
    override fun definition() =
        ModuleDefinition {
            Name("RitulayaWidget")

            AsyncFunction("hideDetails") {
                val context = appContext.reactContext?.applicationContext ?: error("Application context unavailable")
                RitulayaWidgetProvider.hideDetails(context)
            }

            AsyncFunction("finishPrivacyTransition") {
                val context = appContext.reactContext?.applicationContext ?: error("Application context unavailable")
                RitulayaWidgetProvider.finishPrivacyTransition(context)
            }

            AsyncFunction("refreshWidget") {
                val ctx = appContext.reactContext?.applicationContext
                if (ctx != null) {
                    RitulayaWidgetProvider.refresh(ctx)
                }
            }
        }
}
