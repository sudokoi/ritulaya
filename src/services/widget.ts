import RitulayaWidget from "../../modules/ritulaya-widget"

export async function updateWidget(
  dayNumber: number,
  phaseName: string,
  daysUntilNext: number,
  discreetMode: boolean,
) {
  if (!RitulayaWidget) return
  await RitulayaWidget.updateWidget(dayNumber, phaseName, daysUntilNext, discreetMode)
}
