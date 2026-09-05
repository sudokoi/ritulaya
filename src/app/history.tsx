import { memo, useCallback, useMemo, useState } from "react"
import {
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from "react-native"
import { format, parseISO } from "date-fns"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ChevronLeft } from "lucide-react-native"
import { Button } from "@/components/ui/button"
import { DayDetailSheet } from "@/components/day-detail-sheet"
import { useDayLogs } from "@/hooks/use-day-logs"
import { useDayEditor } from "@/hooks/use-day-editor"
import { useSettings } from "@/hooks/use-settings"
import { useThemeColors } from "@/hooks/use-theme-colors"
import { SYMPTOM_CATALOG } from "@/constants/symptoms"
import { MOOD_CATALOG } from "@/constants/moods"
import { EMPTY_HISTORY_FILTERS, searchDayEntries } from "@/domain/day-entry-history"
import { cn } from "@/lib/utils"
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
  const dateLabel = format(parseISO(entry.date), "PP")
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
      accessibilityLabel={t("history.editDate", { date: dateLabel })}
      className="mx-4 mb-3 min-h-11 rounded-card bg-[var(--bg-surface)] px-5 py-4 active:opacity-60"
    >
      <Text className="text-base font-semibold text-[var(--text-primary)]">
        {dateLabel}
      </Text>
      {discreet ? (
        <Text className="mt-2 text-sm text-[var(--text-muted)]">
          {t("history.privatePreview")}
        </Text>
      ) : (
        <>
          {details ? (
            <Text numberOfLines={2} className="mt-2 text-sm text-[var(--text-primary)]">
              {details}
            </Text>
          ) : null}
          {entry.notes ? (
            <Text numberOfLines={2} className="mt-2 text-sm text-[var(--text-muted)]">
              {entry.notes}
            </Text>
          ) : null}
          <Text className="mt-2 text-sm text-[var(--accent)]">
            {t("today.editEntry")}
          </Text>
        </>
      )}
    </Pressable>
  )
})

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      className={cn(
        "mr-2 min-h-11 justify-center rounded-pill px-4 py-2 active:opacity-60",
        selected ? "bg-[var(--accent)]" : "bg-[var(--bg-muted)]",
      )}
    >
      <Text
        className={cn(
          "text-sm",
          selected ? "text-[var(--on-accent)]" : "text-[var(--text-primary)]",
        )}
      >
        {label}
      </Text>
    </Pressable>
  )
}

function DateFilter({
  label,
  value,
  onChangeText,
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
}) {
  const { muted } = useThemeColors()
  return (
    <View className="flex-1">
      <Text className="mb-2 text-sm text-[var(--text-muted)]">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={label}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={muted}
        autoCorrect={false}
        autoCapitalize="none"
        maxLength={10}
        className="min-h-11 rounded-button bg-[var(--bg-surface)] px-3 py-3 text-base text-[var(--text-primary)]"
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
        className="flex-row items-center gap-2 px-4 pb-2"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Pressable
          onPress={() => {
            if (router.canGoBack()) router.back()
            else router.replace("/(tabs)/calendar")
          }}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          className="min-h-11 min-w-11 items-center justify-center active:opacity-60"
        >
          <ChevronLeft size={24} color={muted} />
        </Pressable>
        <Text
          accessibilityRole="header"
          className="text-2xl font-bold text-[var(--text-primary)]"
        >
          {t("history.title")}
        </Text>
      </View>
      <FlatList
        data={entries}
        keyExtractor={entryKey}
        renderItem={renderEntry}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          <View className="px-4 pt-3 pb-4">
            <Text className="mb-3 text-sm text-[var(--text-muted)]">
              {t("history.localSearch")}
            </Text>
            <TextInput
              value={filters.notesQuery}
              onChangeText={(notesQuery) =>
                setFilters((prev) => ({ ...prev, notesQuery }))
              }
              accessibilityLabel={t("history.searchNotes")}
              placeholder={t("history.searchNotes")}
              placeholderTextColor={muted}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              className="min-h-11 rounded-button bg-[var(--bg-surface)] px-4 py-3 text-base text-[var(--text-primary)]"
            />
            <View className="mt-2 flex-row flex-wrap items-center justify-between">
              <Pressable
                onPress={() => setFiltersExpanded((prev) => !prev)}
                accessibilityRole="button"
                accessibilityState={{ expanded: filtersExpanded }}
                accessibilityLabel={t("history.filters")}
                className="min-h-11 justify-center px-2 active:opacity-60"
              >
                <Text className="text-sm font-medium text-[var(--accent)]">
                  {t("history.filters")}
                </Text>
              </Pressable>
              <Button
                variant="ghost"
                size="md"
                onPress={() => setFilters(EMPTY_HISTORY_FILTERS)}
              >
                {t("history.clearFilters")}
              </Button>
            </View>
            {filtersExpanded ? (
              <View className="mt-2 gap-3">
                <View className="flex-row gap-3">
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
                <Text className="text-sm text-[var(--text-muted)]">
                  {t("history.dateHint")}
                </Text>
                <Text className="text-sm font-medium text-[var(--text-primary)]">
                  {t("sheet.symptoms")}
                </Text>
                <ScrollView horizontal keyboardShouldPersistTaps="handled">
                  <FilterChip
                    label={t("history.anySymptom")}
                    selected={filters.symptom === null}
                    onPress={() => setFilters((prev) => ({ ...prev, symptom: null }))}
                  />
                  {SYMPTOM_CATALOG.map(({ key }) => (
                    <FilterChip
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
                </ScrollView>
                <Text className="text-sm font-medium text-[var(--text-primary)]">
                  {t("sheet.mood")}
                </Text>
                <ScrollView horizontal keyboardShouldPersistTaps="handled">
                  <FilterChip
                    label={t("history.anyMood")}
                    selected={filters.mood === null}
                    onPress={() => setFilters((prev) => ({ ...prev, mood: null }))}
                  />
                  {MOOD_CATALOG.map(({ key }) => (
                    <FilterChip
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
                </ScrollView>
              </View>
            ) : null}
            {error ? (
              <Text
                accessibilityRole="alert"
                className="mt-3 text-sm text-[var(--text-primary)]"
              >
                {t(`history.${error}`)}
              </Text>
            ) : (
              <Text className="mt-3 text-sm text-[var(--text-muted)]">
                {t("history.results", { count: entries.length })}
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          error ? null : (
            <View className="mx-4 rounded-card bg-[var(--bg-surface)] p-5">
              <Text className="text-base font-semibold text-[var(--text-primary)]">
                {t(logs.length === 0 ? "history.emptyTitle" : "history.noResults")}
              </Text>
              <Text className="mt-2 text-sm text-[var(--text-muted)]">
                {t(logs.length === 0 ? "history.emptyBody" : "history.noResultsBody")}
              </Text>
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
