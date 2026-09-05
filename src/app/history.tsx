import { memo, useCallback, useMemo, useState } from "react"
import {
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  View,
  type ListRenderItem,
} from "react-native"
import { format, parseISO } from "date-fns"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ChevronLeft } from "lucide-react-native"
import { Button } from "@/components/ui/button"
import { AppText } from "@/components/ui/text"
import { Field } from "@/components/ui/field"
import { ChoiceChip } from "@/components/ui/choice-chip"
import { IconButton } from "@/components/ui/icon-button"
import { DayDetailSheet } from "@/components/day-detail-sheet"
import { useDayLogs } from "@/hooks/use-day-logs"
import { useDayEditor } from "@/hooks/use-day-editor"
import { useSettings } from "@/hooks/use-settings"
import { useThemeColors } from "@/hooks/use-theme-colors"
import { useDateLocale } from "@/hooks/use-date-locale"
import { SYMPTOM_CATALOG } from "@/constants/symptoms"
import { MOOD_CATALOG } from "@/constants/moods"
import { EMPTY_HISTORY_FILTERS, searchDayEntries } from "@/domain/day-entry-history"
import type { DayLog } from "@/types/day-log"

const entryKey = (entry: DayLog) => entry.id

const HistoryRow = memo(function HistoryRow({
  entry,
  discreet,
  onOpen,
}: {
  entry: DayLog
  discreet: boolean
  onOpen: (date: Date) => void
}) {
  const { t } = useTranslation()
  const locale = useDateLocale()
  const dateLabel = format(parseISO(entry.date), "PP", { locale })
  const details = [
    entry.flowIntensity ? t(`flow.${entry.flowIntensity}`) : null,
    entry.mood ? t(`moods.${entry.mood}`) : null,
    ...entry.symptoms.map((symptom) => t(`symptoms.${symptom}`)),
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <Pressable
      onPress={() => onOpen(parseISO(entry.date))}
      accessibilityRole="button"
      accessibilityLabel={[
        t("history.editDate", { date: dateLabel }),
        discreet
          ? t("history.privatePreview")
          : [details, entry.notes].filter(Boolean).join(". "),
      ]
        .filter(Boolean)
        .join(". ")}
      className="mx-screen mb-3 min-h-touch gap-2 rounded-card bg-[var(--bg-surface)] p-screen active:opacity-60"
    >
      <AppText variant="section">{dateLabel}</AppText>
      {discreet ? (
        <AppText variant="supporting" tone="muted">
          {t("history.privatePreview")}
        </AppText>
      ) : (
        <>
          {details ? (
            <AppText numberOfLines={2} variant="supporting">
              {details}
            </AppText>
          ) : null}
          {entry.notes ? (
            <AppText numberOfLines={2} variant="supporting" tone="muted">
              {entry.notes}
            </AppText>
          ) : null}
          <AppText variant="supporting" tone="accent">
            {t("today.editEntry")}
          </AppText>
        </>
      )}
    </Pressable>
  )
})

function DateFilter({
  label,
  value,
  onChangeText,
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
}) {
  return (
    <View className="min-w-[180px] flex-1">
      <Field
        label={label}
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={label}
        placeholder="YYYY-MM-DD"
        autoCorrect={false}
        autoCapitalize="none"
        maxLength={10}
      />
    </View>
  )
}

export default function HistoryScreen() {
  const { t } = useTranslation()
  const { logs } = useDayLogs()
  const { discreetMode } = useSettings()
  const { muted } = useThemeColors()
  const insets = useSafeAreaInsets()
  const [filters, setFilters] = useState(EMPTY_HISTORY_FILTERS)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const {
    selectedDate,
    existingLog,
    open,
    close,
    handleSave,
    handleDelete,
    handleClearPeriod,
  } = useDayEditor()
  const { entries, error } = useMemo(
    () => searchDayEntries(logs, filters),
    [logs, filters],
  )
  const openEntry = useCallback(
    (date: Date) => {
      Keyboard.dismiss()
      open(date)
    },
    [open],
  )
  const renderEntry: ListRenderItem<DayLog> = useCallback(
    ({ item }) => <HistoryRow entry={item} discreet={discreetMode} onOpen={openEntry} />,
    [discreetMode, openEntry],
  )

  return (
    <View className="flex-1 bg-[var(--bg-primary)]">
      <View
        className="flex-row items-center gap-3 px-screen pb-3"
        style={{ paddingTop: insets.top + 20 }}
      >
        <IconButton
          onPress={() => {
            if (router.canGoBack()) router.back()
            else router.replace("/(tabs)/calendar")
          }}
          accessibilityLabel={t("common.back")}
        >
          <ChevronLeft size={24} color={muted} />
        </IconButton>
        <AppText variant="screen" accessibilityRole="header" className="flex-1">
          {t("history.title")}
        </AppText>
      </View>
      <FlatList
        data={entries}
        keyExtractor={entryKey}
        renderItem={renderEntry}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          <View className="gap-3 px-screen pt-3 pb-5">
            <AppText variant="supporting" tone="muted">
              {t("history.localSearch")}
            </AppText>
            <Field
              label={t("history.searchNotes")}
              value={filters.notesQuery}
              onChangeText={(notesQuery) =>
                setFilters((prev) => ({ ...prev, notesQuery }))
              }
              accessibilityLabel={t("history.searchNotes")}
              placeholder={t("history.searchNotes")}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            <View className="gap-2">
              <Button
                variant="secondary"
                textClassName="grow"
                onPress={() => setFiltersExpanded((prev) => !prev)}
                accessibilityState={{ expanded: filtersExpanded }}
                accessibilityLabel={t("history.filters")}
              >
                {t("history.filters")}
              </Button>
              <Button
                variant="ghost"
                size="md"
                textClassName="grow"
                onPress={() => setFilters(EMPTY_HISTORY_FILTERS)}
              >
                {t("history.clearFilters")}
              </Button>
            </View>
            {filtersExpanded ? (
              <View className="gap-4 border-y border-[var(--border)] py-4">
                <View className="flex-row flex-wrap gap-3">
                  <DateFilter
                    label={t("history.fromDate")}
                    value={filters.fromDate}
                    onChangeText={(fromDate) =>
                      setFilters((prev) => ({ ...prev, fromDate }))
                    }
                  />
                  <DateFilter
                    label={t("history.toDate")}
                    value={filters.toDate}
                    onChangeText={(toDate) => setFilters((prev) => ({ ...prev, toDate }))}
                  />
                </View>
                <AppText variant="supporting" tone="muted">
                  {t("history.dateHint")}
                </AppText>
                <AppText variant="label">{t("sheet.symptoms")}</AppText>
                <ScrollView horizontal keyboardShouldPersistTaps="handled">
                  <View className="flex-row gap-2 pb-2">
                    <ChoiceChip
                      label={t("history.anySymptom")}
                      selected={filters.symptom === null}
                      onPress={() => setFilters((prev) => ({ ...prev, symptom: null }))}
                    />
                    {SYMPTOM_CATALOG.map(({ key }) => (
                      <ChoiceChip
                        key={key}
                        label={t(`symptoms.${key}`)}
                        selected={filters.symptom === key}
                        onPress={() =>
                          setFilters((prev) => ({
                            ...prev,
                            symptom: prev.symptom === key ? null : key,
                          }))
                        }
                      />
                    ))}
                  </View>
                </ScrollView>
                <AppText variant="label">{t("sheet.mood")}</AppText>
                <ScrollView horizontal keyboardShouldPersistTaps="handled">
                  <View className="flex-row gap-2 pb-2">
                    <ChoiceChip
                      label={t("history.anyMood")}
                      selected={filters.mood === null}
                      onPress={() => setFilters((prev) => ({ ...prev, mood: null }))}
                    />
                    {MOOD_CATALOG.map(({ key }) => (
                      <ChoiceChip
                        key={key}
                        label={t(`moods.${key}`)}
                        selected={filters.mood === key}
                        onPress={() =>
                          setFilters((prev) => ({
                            ...prev,
                            mood: prev.mood === key ? null : key,
                          }))
                        }
                      />
                    ))}
                  </View>
                </ScrollView>
              </View>
            ) : null}
            {error ? (
              <AppText
                variant="supporting"
                tone="danger"
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                {t(`history.${error}`)}
              </AppText>
            ) : (
              <AppText variant="supporting" tone="muted">
                {t("history.results", { count: entries.length })}
              </AppText>
            )}
          </View>
        }
        ListEmptyComponent={
          error ? null : (
            <View className="mx-screen gap-3 rounded-card bg-[var(--bg-surface)] p-screen">
              <AppText variant="section">
                {t(logs.length === 0 ? "history.emptyTitle" : "history.noResults")}
              </AppText>
              <AppText variant="supporting" tone="muted">
                {t(logs.length === 0 ? "history.emptyBody" : "history.noResultsBody")}
              </AppText>
              {logs.length === 0 ? (
                <Button size="md" className="mt-4" onPress={() => openEntry(new Date())}>
                  {t("today.logToday")}
                </Button>
              ) : null}
            </View>
          )
        }
      />
      <DayDetailSheet
        key={selectedDate ? format(selectedDate, "yyyy-MM-dd") : "closed"}
        visible={selectedDate !== null}
        date={selectedDate ?? new Date()}
        existing={existingLog}
        onSave={handleSave}
        onClearPeriod={existingLog ? handleClearPeriod : undefined}
        onDelete={existingLog ? handleDelete : undefined}
        onClose={close}
      />
    </View>
  )
}
