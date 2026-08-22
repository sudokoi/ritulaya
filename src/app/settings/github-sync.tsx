import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Linking,
  ActivityIndicator,
  Alert,
} from "react-native"
import { useEffect, useRef, useState } from "react"
import { router } from "expo-router"
import * as Clipboard from "expo-clipboard"
import {
  ChevronLeft,
  Cloud,
  Trash2,
  RefreshCw,
  Plus,
  Copy,
  Check,
} from "lucide-react-native"
import { useSync } from "@/hooks/use-sync"
import { useSettings } from "@/hooks/use-settings"
import { useThemeColors } from "@/hooks/use-theme-colors"
import { discreetLabel } from "@/lib/discreet"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"

const REPO_NAME_PATTERN = /^[A-Za-z0-9._-]+$/

export default function GithubSyncScreen() {
  const { t } = useTranslation()
  const sync = useSync()
  const { discreetMode: discreet } = useSettings()
  const { muted, accent, danger } = useThemeColors()

  const [repoName, setRepoName] = useState("ritulaya-data")
  const [existingOwner, setExistingOwner] = useState("")
  const [existingRepo, setExistingRepo] = useState("")
  const [copiedCode, setCopiedCode] = useState(false)
  const existingRepoInputRef = useRef<TextInput>(null)

  useEffect(() => {
    if (!copiedCode) return
    const timer = setTimeout(() => setCopiedCode(false), 2000)
    return () => clearTimeout(timer)
  }, [copiedCode])

  const openVerification = () => {
    if (sync.deviceFlow) {
      void Linking.openURL(sync.deviceFlow.verificationUrl)
    }
  }

  const copyUserCode = async () => {
    if (!sync.deviceFlow) return
    await Clipboard.setStringAsync(sync.deviceFlow.userCode)
    setCopiedCode(true)
  }

  const validateRepoName = (name: string): string | null => {
    if (!name) return t("sync.emptyNameError")
    if (!REPO_NAME_PATTERN.test(name)) {
      return t("sync.charsetError")
    }
    return null
  }

  const handleCreateRepo = () => {
    const name = repoName.trim()
    const problem = validateRepoName(name)
    if (problem) {
      Alert.alert(t("sync.invalidNameTitle"), problem)
      return
    }
    void sync.createNewRepo(name)
  }

  const handleUseExistingRepo = () => {
    const owner = existingOwner.trim() || sync.username || ""
    const repo = existingRepo.trim()
    const problem = validateRepoName(repo) ?? (owner ? null : t("sync.ownerError"))
    if (problem) {
      Alert.alert(t("sync.invalidRepoTitle"), problem)
      return
    }
    void sync.useExistingRepo(owner, repo)
  }

  return (
    <ScrollView
      className="flex-1 bg-[var(--bg-primary)]"
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-row items-center gap-2 px-4 pt-14 pb-4">
        <Pressable
          onPress={() => router.back()}
          className="p-2 active:opacity-60"
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
        >
          <ChevronLeft size={24} color={muted} />
        </Pressable>
        <Text className="text-2xl font-bold text-[var(--text-primary)]">
          {discreetLabel(discreet, t("sync.title"), t("discreet.githubSync"))}
        </Text>
      </View>

      {sync.error ? (
        <View className="mx-4 mb-4 rounded-card bg-red-500/10 px-5 py-3">
          <Text className="text-sm" style={{ color: danger }}>
            {sync.error}
          </Text>
        </View>
      ) : null}

      {!sync.connected && !sync.deviceFlow && (
        <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] px-5 py-6">
          <Cloud size={40} color={muted} />
          <Text className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
            {t("sync.backUpTitle")}
          </Text>
          <Text className="mt-2 text-sm text-[var(--text-muted)]">
            {t("sync.backUpBody")}
          </Text>
          <Pressable
            onPress={() => void sync.connect()}
            disabled={sync.connecting}
            className="mt-6 rounded-button bg-accent px-6 py-4 active:opacity-60"
            accessibilityRole="button"
          >
            {sync.connecting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-center font-semibold text-white">
                {t("sync.connect")}
              </Text>
            )}
          </Pressable>
        </View>
      )}

      {sync.deviceFlow ? (
        <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] px-5 py-6">
          <Text className="text-lg font-semibold text-[var(--text-primary)]">
            {t("sync.authorizeTitle")}
          </Text>
          <Text className="mt-2 text-sm text-[var(--text-muted)]">
            {t("sync.authorizeBody")}
          </Text>
          <Pressable
            onPress={() => void copyUserCode()}
            className="mt-4 flex-row items-center justify-between rounded-card bg-[var(--bg-primary)] px-6 py-4 active:opacity-60"
            accessibilityRole="button"
            accessibilityLabel={t("sync.copyCode")}
          >
            <Text className="flex-1 text-center text-3xl font-bold tracking-[0.3em] text-[var(--text-primary)]">
              {sync.deviceFlow.userCode}
            </Text>
            {copiedCode ? (
              <Check size={18} color={accent} />
            ) : (
              <Copy size={18} color={muted} />
            )}
          </Pressable>
          <Pressable
            onPress={openVerification}
            className="mt-6 rounded-button bg-accent px-6 py-4 active:opacity-60"
            accessibilityRole="button"
          >
            <Text className="text-center font-semibold text-white">
              {t("sync.openGithub")}
            </Text>
          </Pressable>
          <View className="mt-4 flex-row items-center justify-center gap-2">
            <ActivityIndicator size="small" color={muted} />
            <Text className="text-sm text-[var(--text-muted)]">{t("sync.waiting")}</Text>
          </View>
        </View>
      ) : null}

      {sync.connected && !sync.config ? (
        <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] px-5 py-6">
          <Text className="text-lg font-semibold text-[var(--text-primary)]">
            {t("sync.chooseRepo")}
          </Text>

          <Text className="mt-4 text-sm font-medium text-[var(--text-muted)]">
            {t("sync.createNew")}
          </Text>
          <View className="mt-2 flex-row items-center gap-2">
            <TextInput
              value={repoName}
              onChangeText={setRepoName}
              className="flex-1 rounded-button bg-[var(--bg-primary)] px-4 py-3 text-[var(--text-primary)]"
              placeholder={t("sync.repoNamePlaceholder")}
              placeholderTextColor={muted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleCreateRepo}
            />
            <Pressable
              onPress={handleCreateRepo}
              disabled={sync.busy}
              className="rounded-button bg-accent p-3.5 active:opacity-60"
              accessibilityRole="button"
              accessibilityLabel={t("sync.createRepo")}
            >
              <Plus size={20} color="#fff" />
            </Pressable>
          </View>

          <Text className="mt-6 text-sm font-medium text-[var(--text-muted)]">
            {t("sync.orUseExisting")}
          </Text>
          <TextInput
            value={existingOwner}
            onChangeText={setExistingOwner}
            className="mt-2 rounded-button bg-[var(--bg-primary)] px-4 py-3 text-[var(--text-primary)]"
            placeholder={sync.username ?? t("sync.ownerPlaceholder")}
            placeholderTextColor={muted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => existingRepoInputRef.current?.focus()}
          />
          <TextInput
            ref={existingRepoInputRef}
            value={existingRepo}
            onChangeText={setExistingRepo}
            className="mt-2 rounded-button bg-[var(--bg-primary)] px-4 py-3 text-[var(--text-primary)]"
            placeholder={t("sync.repoNamePlaceholder")}
            placeholderTextColor={muted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleUseExistingRepo}
          />
          <Pressable
            onPress={handleUseExistingRepo}
            disabled={sync.busy || !existingRepo.trim()}
            className={cn(
              "mt-4 rounded-button px-6 py-3 active:opacity-60",
              existingRepo.trim() ? "bg-accent" : "bg-[var(--bg-muted)]",
            )}
            accessibilityRole="button"
          >
            <Text
              className={cn(
                "text-center font-semibold",
                existingRepo.trim() ? "text-white" : "text-[var(--text-muted)]",
              )}
            >
              {t("sync.useRepo")}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {sync.connected && sync.config ? (
        <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] px-5 py-6">
          <View className="flex-row items-center gap-3">
            <Cloud size={24} color={accent} />
            <View className="flex-1">
              <Text className="text-lg font-semibold text-[var(--text-primary)]">
                {sync.config.repoOwner}/{sync.config.repoName}
              </Text>
              <Text className="text-sm text-[var(--text-muted)]">
                {sync.status?.syncedAt ? t("sync.synced") : t("sync.notSyncedYet")}
              </Text>
            </View>
            <View className="h-2.5 w-2.5 rounded-full bg-accent" />
          </View>

          <Pressable
            onPress={() => void sync.syncNow()}
            disabled={sync.syncing}
            className="mt-6 flex-row items-center justify-center gap-2 rounded-button bg-accent px-6 py-4 active:opacity-60"
            accessibilityRole="button"
          >
            {sync.syncing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <RefreshCw size={18} color="#fff" />
            )}
            <Text className="font-semibold text-white">{t("sync.syncNow")}</Text>
          </Pressable>

          <Pressable
            onPress={() => void sync.disconnect()}
            disabled={sync.busy}
            className="mt-3 flex-row items-center justify-center gap-2 rounded-button bg-[var(--bg-muted)] px-6 py-4 active:opacity-60"
            accessibilityRole="button"
            accessibilityLabel={t("sync.disconnect")}
          >
            <Trash2 size={18} color={danger} />
            <Text className="font-semibold" style={{ color: danger }}>
              {t("sync.disconnect")}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  )
}
