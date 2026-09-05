import { View } from "react-native"
import { useTranslation } from "react-i18next"
import type { DayLog } from "@/types/day-log"
import { Button } from "@/components/ui/button"
import { AppText } from "@/components/ui/text"

interface TodayCardProps {
  log: DayLog | null
  discreet?: boolean
  onEdit: () => void
}

export function TodayCard({ log, discreet = false, onEdit }: TodayCardProps) {
  const { t } = useTranslation()
  const details =
    !discreet && log
      ? [
          log.flowIntensity
            ? t("sheet.flowState", { label: t(`flow.${log.flowIntensity}`) })
            : null,
          log.mood ? t(`moods.${log.mood}`) : null,
          ...log.symptoms.map((symptom) => t(`symptoms.${symptom}`)),
        ]
          .filter(Boolean)
          .join(" · ")
      : ""

  return (
    <View className="gap-3 rounded-card bg-[var(--bg-surface)] p-screen">
      <AppText variant="section" accessibilityRole="header">
        {t("today.entryTitle")}
      </AppText>
      {discreet ? (
        <AppText variant="supporting" tone="muted">
          {t("today.detailsHidden")}
        </AppText>
      ) : log ? (
        <>
          {details ? <AppText>{details}</AppText> : null}
          {log.notes ? (
            <AppText variant="supporting" tone="muted" numberOfLines={3}>
              {log.notes}
            </AppText>
          ) : null}
        </>
      ) : (
        <AppText variant="supporting" tone="muted">
          {t("today.nothingLogged")}
        </AppText>
      )}
      <Button
        onPress={onEdit}
        size="md"
        accessibilityLabel={t(
          discreet ? "today.openEntry" : log ? "today.editToday" : "today.logToday",
        )}
      >
        {t(discreet ? "today.openEntry" : log ? "today.editToday" : "today.logToday")}
      </Button>
    </View>
  )
}
