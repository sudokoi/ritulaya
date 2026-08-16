import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Linking,
  ActivityIndicator,
} from "react-native"
import { useState } from "react"
import { router } from "expo-router"
import { ChevronLeft, Cloud, Trash2, RefreshCw, Plus } from "lucide-react-native"
import { useSync } from "@/hooks/use-sync"
import { useSettings } from "@/hooks/use-settings"
import { useThemeColors } from "@/hooks/use-theme-colors"
import { discreetLabel } from "@/lib/discreet"
import { cn } from "@/lib/utils"

export default function GithubSyncScreen() {
  const sync = useSync()
  const { discreetMode: discreet } = useSettings()
  const { muted, accent } = useThemeColors()

  const [repoName, setRepoName] = useState("ritulaya-data")
  const [existingOwner, setExistingOwner] = useState("")
  const [existingRepo, setExistingRepo] = useState("")

  const openVerification = () => {
    if (sync.deviceFlow) {
      void Linking.openURL(sync.deviceFlow.verificationUrl)
    }
  }

  const handleConnect = async () => {
    await sync.connect()
  }

  const handleDisconnect = async () => {
    await sync.disconnect()
  }

  return (
    <ScrollView className="flex-1 bg-[var(--bg-primary)]">
      <View className="flex-row items-center gap-2 px-4 pt-14 pb-4">
        <Pressable onPress={() => router.back()} className="p-2 active:opacity-60">
          <ChevronLeft size={24} color={muted} />
        </Pressable>
        <Text className="text-2xl font-bold text-[var(--text-primary)]">
          {discreetLabel(discreet, "GitHub Sync", "Backup Sync")}
        </Text>
      </View>

      {sync.error ? (
        <View className="mx-4 mb-4 rounded-card bg-red-500/10 px-5 py-3">
          <Text className="text-sm text-red-500">{sync.error}</Text>
        </View>
      ) : null}

      {!sync.connected && !sync.deviceFlow && (
        <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] px-5 py-6">
          <Cloud size={40} color={muted} />
          <Text className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
            {discreetLabel(discreet, "Back up to GitHub", "Back up your data")}
          </Text>
          <Text className="mt-2 text-sm text-[var(--text-muted)]">
            {discreetLabel(
              discreet,
              "Sync your cycles to a private GitHub repository you control. It syncs automatically in the background.",
              "Sync your data to a private repository you control. It syncs automatically.",
            )}
          </Text>
          <Pressable
            onPress={() => handleConnect()}
            disabled={sync.connecting}
            className="mt-6 rounded-button bg-accent px-6 py-4 active:opacity-60"
          >
            {sync.connecting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-center font-semibold text-white">
                {discreetLabel(discreet, "Connect GitHub", "Connect")}
              </Text>
            )}
          </Pressable>
        </View>
      )}

      {sync.deviceFlow ? (
        <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] px-5 py-6">
          <Text className="text-lg font-semibold text-[var(--text-primary)]">
            {discreetLabel(discreet, "Authorize on GitHub", "Authorize")}
          </Text>
          <Text className="mt-2 text-sm text-[var(--text-muted)]">
            {discreetLabel(
              discreet,
              "Enter this code on GitHub to authorize:",
              "Enter this code to authorize:",
            )}
          </Text>
          <View className="mt-4 rounded-card bg-[var(--bg-primary)] px-6 py-4">
            <Text className="text-center text-3xl font-bold tracking-[0.3em] text-[var(--text-primary)]">
              {sync.deviceFlow.userCode}
            </Text>
          </View>
          <Pressable
            onPress={openVerification}
            className="mt-6 rounded-button bg-accent px-6 py-4 active:opacity-60"
          >
            <Text className="text-center font-semibold text-white">
              {discreetLabel(discreet, "Open GitHub", "Open Browser")}
            </Text>
          </Pressable>
          <View className="mt-4 flex-row items-center justify-center gap-2">
            <ActivityIndicator size="small" color={muted} />
            <Text className="text-sm text-[var(--text-muted)]">
              {discreetLabel(discreet, "Waiting for authorization…", "Waiting…")}
            </Text>
          </View>
        </View>
      ) : null}

      {sync.connected && !sync.config ? (
        <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] px-5 py-6">
          <Text className="text-lg font-semibold text-[var(--text-primary)]">
            {discreetLabel(discreet, "Choose a repository", "Choose a repository")}
          </Text>

          <Text className="mt-4 text-sm font-medium text-[var(--text-muted)]">
            {discreetLabel(discreet, "Create a new repository", "Create new")}
          </Text>
          <View className="mt-2 flex-row items-center gap-2">
            <TextInput
              value={repoName}
              onChangeText={setRepoName}
              className="flex-1 rounded-button bg-[var(--bg-primary)] px-4 py-3 text-[var(--text-primary)]"
              placeholder="repository-name"
              placeholderTextColor={muted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              onPress={() => sync.createNewRepo(repoName.trim() || "ritulaya-data")}
              disabled={sync.busy}
              className="rounded-button bg-accent px-5 py-3 active:opacity-60"
            >
              <Plus size={20} color="#fff" />
            </Pressable>
          </View>

          <Text className="mt-6 text-sm font-medium text-[var(--text-muted)]">
            {discreetLabel(discreet, "Or use an existing repository", "Or use existing")}
          </Text>
          <TextInput
            value={existingOwner}
            onChangeText={setExistingOwner}
            className="mt-2 rounded-button bg-[var(--bg-primary)] px-4 py-3 text-[var(--text-primary)]"
            placeholder={sync.username ?? "owner"}
            placeholderTextColor={muted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            value={existingRepo}
            onChangeText={setExistingRepo}
            className="mt-2 rounded-button bg-[var(--bg-primary)] px-4 py-3 text-[var(--text-primary)]"
            placeholder="repository-name"
            placeholderTextColor={muted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            onPress={() =>
              sync.useExistingRepo(
                existingOwner.trim() || sync.username || "",
                existingRepo.trim(),
              )
            }
            disabled={sync.busy || !existingRepo.trim()}
            className={cn(
              "mt-4 rounded-button px-6 py-3 active:opacity-60",
              existingRepo.trim() ? "bg-accent" : "bg-[var(--bg-muted)]",
            )}
          >
            <Text
              className={cn(
                "text-center font-semibold",
                existingRepo.trim() ? "text-white" : "text-[var(--text-muted)]",
              )}
            >
              {discreetLabel(discreet, "Use Repository", "Use Repository")}
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
                {sync.status?.syncedAt
                  ? discreetLabel(discreet, "Synced", "Synced")
                  : discreetLabel(discreet, "Not synced yet", "Not synced yet")}
              </Text>
            </View>
            <View className="h-2.5 w-2.5 rounded-full bg-accent" />
          </View>

          <Pressable
            onPress={() => sync.syncNow()}
            disabled={sync.syncing}
            className="mt-6 flex-row items-center justify-center gap-2 rounded-button bg-accent px-6 py-4 active:opacity-60"
          >
            {sync.syncing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <RefreshCw size={18} color="#fff" />
            )}
            <Text className="font-semibold text-white">
              {discreetLabel(discreet, "Sync Now", "Sync Now")}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleDisconnect()}
            disabled={sync.busy}
            className="mt-3 flex-row items-center justify-center gap-2 rounded-button bg-[var(--bg-muted)] px-6 py-4 active:opacity-60"
          >
            <Trash2 size={18} color="#EF4444" />
            <Text className="font-semibold text-red-500">
              {discreetLabel(discreet, "Disconnect", "Disconnect")}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  )
}
