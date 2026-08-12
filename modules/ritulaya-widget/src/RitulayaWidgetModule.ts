import { requireOptionalNativeModule } from "expo"

interface RitulayaWidgetNativeModule {
  updateWidget(
    dayNumber: number,
    phaseName: string,
    daysUntilNext: number,
    discreetMode: boolean,
  ): Promise<void>
}

export default requireOptionalNativeModule<RitulayaWidgetNativeModule>("RitulayaWidget")
