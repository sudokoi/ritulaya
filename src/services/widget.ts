import RitulayaWidget from "../../modules/ritulaya-widget"

export async function hideWidgetDetails() {
  if (!RitulayaWidget) throw new Error("Widget privacy module unavailable")
  await RitulayaWidget.hideDetails()
}

export async function restoreWidgetDetails() {
  if (!RitulayaWidget) throw new Error("Widget privacy module unavailable")
  await RitulayaWidget.finishPrivacyTransition()
}

export async function refreshWidget() {
  if (!RitulayaWidget) return
  await RitulayaWidget.refreshWidget()
}
