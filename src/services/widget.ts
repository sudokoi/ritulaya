import RitulayaWidget from "../../modules/ritulaya-widget"

export async function refreshWidget() {
  if (!RitulayaWidget) return
  await RitulayaWidget.refreshWidget()
}
