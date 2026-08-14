import { requireOptionalNativeModule } from "expo"

interface RitulayaWidgetNativeModule {
  refreshWidget(): Promise<void>
}

export default requireOptionalNativeModule<RitulayaWidgetNativeModule>("RitulayaWidget")
