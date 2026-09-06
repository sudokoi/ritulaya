import { useCallback, useEffect, useRef, useState } from "react"
import { FlatList, View } from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import { format, parseISO } from "date-fns"
import { AppText } from "@/components/ui/text"
import { Button } from "@/components/ui/button"
import { useSettings } from "@/hooks/use-settings"
import { useDateLocale } from "@/hooks/use-date-locale"
import {
  previewHistoryRepair as previewCycleRepair,
  confirmHistoryRepair as applyCycleRepair,
} from "@/domain/cycle-history"

export default function RepairHistoryScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const locale = useDateLocale()
  const { discreetMode } = useSettings()
  const [revealed, setRevealed] = useState(false)
  const [preview, setPreview] = useState<Awaited<
    ReturnType<typeof previewCycleRepair>
  > | null>(null)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const mounted = useRef(false)
  const load = useCallback(
    () =>
      previewCycleRepair()
        .then((next) => {
          if (mounted.current) {
            setPreview(next)
            setFailed(false)
          }
        })
        .catch(() => {
          if (mounted.current) setFailed(true)
        }),
    [],
  )
  useEffect(() => {
    mounted.current = true
    void load()
    return () => {
      mounted.current = false
    }
  }, [load])
  const visible = !discreetMode || revealed
  const changed =
    preview &&
    (preview.reassociatedEntries > 0 ||
      JSON.stringify(
        preview.before.map(({ startDate, endDate }) => [startDate, endDate]).sort(),
      ) !==
        JSON.stringify(
          preview.after.map(({ startDate, endDate }) => [startDate, endDate]).sort(),
        ))
  const rows =
    preview && visible
      ? [
          ...preview.before.map((cycle) => ({
            ...cycle,
            side: "repair.before" as const,
          })),
          ...preview.after.map((cycle) => ({ ...cycle, side: "repair.after" as const })),
        ]
      : []
  return (
    <View
      className="flex-1 bg-[var(--bg-primary)]"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <FlatList
        data={rows}
        keyExtractor={(row) => `${row.side}:${row.id}`}
        contentContainerStyle={{ padding: 20, gap: 16 }}
        ListHeaderComponent={
          <View className="gap-4">
            <Button variant="secondary" disabled={busy} onPress={() => router.back()}>
              {t("common.back")}
            </Button>
            <AppText variant="screen" accessibilityRole="header">
              {t("repair.title")}
            </AppText>
            {!visible ? (
              <Button onPress={() => setRevealed(true)}>{t("syncV2.reveal")}</Button>
            ) : (
              <>
                <AppText>{t("repair.body")}</AppText>
                {preview ? (
                  <AppText>
                    {changed
                      ? t("repair.entries", { count: preview.reassociatedEntries })
                      : t("repair.noChanges")}
                  </AppText>
                ) : null}
                {failed ? (
                  <>
                    <AppText accessibilityRole="alert">{t("syncV2.failed")}</AppText>
                    <Button disabled={busy} onPress={load}>
                      {t("gate.tryAgain")}
                    </Button>
                  </>
                ) : null}
              </>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View className="gap-1">
            <AppText variant="label">{t(item.side)}</AppText>
            <AppText>
              {format(parseISO(item.startDate), "PP", { locale })} —{" "}
              {item.endDate
                ? format(parseISO(item.endDate), "PP", { locale })
                : t("repair.open")}
            </AppText>
          </View>
        )}
        ListFooterComponent={
          visible && preview && changed ? (
            <Button
              disabled={busy || failed}
              onPress={async () => {
                if (pending.current) return
                pending.current = true
                setBusy(true)
                try {
                  await applyCycleRepair(preview.token)
                  await load()
                } catch {
                  if (mounted.current) setFailed(true)
                } finally {
                  pending.current = false
                  if (mounted.current) setBusy(false)
                }
              }}
            >
              {t("repair.confirm")}
            </Button>
          ) : null
        }
      />
    </View>
  )
}
