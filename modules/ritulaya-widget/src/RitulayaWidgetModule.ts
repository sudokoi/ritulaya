import { requireOptionalNativeModule } from "expo"

interface RitulayaWidgetNativeModule {
  hideDetails(): Promise<void>
  finishPrivacyTransition(): Promise<void>
  refreshWidget(): Promise<void>
}

export default requireOptionalNativeModule<RitulayaWidgetNativeModule>("RitulayaWidget")
