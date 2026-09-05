import { useCallback, useEffect, useRef, useState } from "react"
import { FlatList, View } from "react-native"
import { router } from "expo-router"
import { ChevronLeft } from "lucide-react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import { AppText } from "@/components/ui/text"
import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import { getSyncReview, resolveSyncReview } from "@/services/sync"
import { syncNowAction } from "@/stores/sync-store"
import { useSettings } from "@/hooks/use-settings"
import { useThemeColors } from "@/hooks/use-theme-colors"
import type { SyncReview } from "@/types/sync"
import { syncFieldLabel, syncValueLabel } from "@/domain/sync-review-display"

export default function SyncReviewScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const { discreetMode } = useSettings()
  const [revealed, setRevealed] = useState(false)
  const [review, setReview] = useState<SyncReview | null>(null)
  const [choices, setChoices] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const pending = useRef(false)
  const mounted = useRef(false)
  const load = useCallback(
    () =>
      getSyncReview()
        .then((next) => {
          if (mounted.current) {
            setFailed(false)
            setReview(next)
            setChoices({})
          }
        })
        .catch(() => {
          if (mounted.current) setFailed(true)
        })
        .finally(() => {
          if (mounted.current) setLoading(false)
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

  const submit = async () => {
    if (!review || pending.current) return
    pending.current = true
    setBusy(true)
    setFailed(false)
    try {
      await resolveSyncReview(
        review.id,
        review.kind === "migration" ? { migration: "approve" } : choices,
      )
      const result = await syncNowAction()
      if (!result || result.status === "error") {
        if (mounted.current) setFailed(true)
        return
      }
      if (mounted.current) await load()
    } catch {
      if (mounted.current) setFailed(true)
    } finally {
      pending.current = false
      if (mounted.current) setBusy(false)
    }
  }
  const visible = !discreetMode || revealed
  return (
    <View
      className="flex-1 bg-[var(--bg-primary)]"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="flex-row items-center gap-3 px-screen py-4">
        <IconButton
          accessibilityLabel={t("common.back")}
          disabled={busy}
          onPress={() => router.back()}
        >
          <ChevronLeft color={colors.muted} />
        </IconButton>
        <AppText variant="screen" accessibilityRole="header" className="flex-1">
          {t("syncV2.review")}
        </AppText>
      </View>
      <FlatList
        data={visible ? (review?.conflicts ?? []) : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, gap: 16 }}
        ListHeaderComponent={
          <View className="gap-4">
            {failed ? (
              <>
                <AppText accessibilityRole="alert">{t("syncV2.failed")}</AppText>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onPress={async () => {
                    if (pending.current) return
                    pending.current = true
                    setBusy(true)
                    setLoading(true)
                    try {
                      const result = await syncNowAction()
                      if (!result || result.status === "error") return
                      await load()
                    } finally {
                      pending.current = false
                      if (mounted.current) {
                        setBusy(false)
                        setLoading(false)
                      }
                    }
                  }}
                >
                  {t("gate.tryAgain")}
                </Button>
              </>
            ) : null}
            {loading ? (
              <AppText>{t("sync.statusSyncing")}</AppText>
            ) : review ? (
              <>
                <AppText>
                  {t(
                    review.kind === "migration"
                      ? "syncV2.migrationBody"
                      : "syncV2.conflictBody",
                  )}
                </AppText>
                {!visible && review.kind === "conflicts" ? (
                  <Button onPress={() => setRevealed(true)}>{t("syncV2.reveal")}</Button>
                ) : null}
              </>
            ) : (
              <AppText>{t("syncV2.noReview")}</AppText>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View className="gap-3 rounded-card bg-[var(--bg-surface)] p-4">
            <AppText variant="section">{item.record}</AppText>
            {item.field ? (
              <AppText tone="muted">{syncFieldLabel(item.field, t)}</AppText>
            ) : null}
            <AppText variant="label">{t("syncV2.local")}</AppText>
            <AppText selectable>{syncValueLabel(item.field, item.local, t)}</AppText>
            <Button
              variant={choices[item.id] === "local" ? "primary" : "secondary"}
              disabled={busy}
              accessibilityState={{ selected: choices[item.id] === "local" }}
              onPress={() =>
                setChoices((current) => ({ ...current, [item.id]: "local" }))
              }
            >
              {t("syncV2.keepLocal")}
            </Button>
            <AppText variant="label">{t("syncV2.remote")}</AppText>
            <AppText selectable>{syncValueLabel(item.field, item.remote, t)}</AppText>
            <Button
              variant={choices[item.id] === "remote" ? "primary" : "secondary"}
              disabled={busy}
              accessibilityState={{ selected: choices[item.id] === "remote" }}
              onPress={() =>
                setChoices((current) => ({ ...current, [item.id]: "remote" }))
              }
            >
              {t("syncV2.keepRemote")}
            </Button>
          </View>
        )}
        ListFooterComponent={
          review && !loading ? (
            <Button
              pending={busy}
              disabled={
                busy ||
                (review.kind === "conflicts" &&
                  (!visible || Object.keys(choices).length !== review.conflicts.length))
              }
              onPress={() => void submit()}
            >
              {t(review.kind === "migration" ? "syncV2.approve" : "syncV2.apply")}
            </Button>
          ) : null
        }
      />
    </View>
  )
}
