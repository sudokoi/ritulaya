import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  ActivityIndicator,
} from "react-native"
import { useState } from "react"
import { router } from "expo-router"
import { ChevronLeft, Cloud, Trash2, RefreshCw, Plus } from "lucide-react-native"
import { useSync } from "@/hooks/use-sync"
import { useSettings } from "@/hooks/use-settings"
import { discreetLabel } from "@/lib/discreet"
import { cn } from "@/lib/utils"

export default function GithubSyncScreen() {
  const sync = useSync()
  const { discreetMode: discreet } = useSettings()

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
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <ChevronLeft size={24} color="#8E8C8A" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-[var(--text-primary)]">
          {discreetLabel(discreet, "GitHub Sync", "Backup Sync")}
        </Text>
      </View>

      {sync.error && (
        <View className="mx-4 mb-4 rounded-card bg-red-500/10 px-5 py-3">
          <Text className="text-sm text-red-500">{sync.error}</Text>
        </View>
      )}

      {!sync.connected && !sync.deviceFlow && (
        <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] px-5 py-6">
          <Cloud size={40} color="#8E8C8A" />
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
          <TouchableOpacity
            onPress={() => handleConnect()}
            disabled={sync.connecting}
            className="mt-6 rounded-button bg-follicular px-6 py-4"
          >
            {sync.connecting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-center font-semibold text-white">
                {discreetLabel(discreet, "Connect GitHub", "Connect")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {sync.deviceFlow && (
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
          <TouchableOpacity
            onPress={openVerification}
            className="mt-6 rounded-button bg-follicular px-6 py-4"
          >
            <Text className="text-center font-semibold text-white">
              {discreetLabel(discreet, "Open GitHub", "Open Browser")}
            </Text>
          </TouchableOpacity>
          <View className="mt-4 flex-row items-center justify-center gap-2">
            <ActivityIndicator size="small" color="#8E8C8A" />
            <Text className="text-sm text-[var(--text-muted)]">
              {discreetLabel(discreet, "Waiting for authorization…", "Waiting…")}
            </Text>
          </View>
        </View>
      )}

      {sync.connected && !sync.config && (
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
              placeholderTextColor="#8E8C8A"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => sync.createNewRepo(repoName.trim() || "ritulaya-data")}
              disabled={sync.busy}
              className="rounded-button bg-follicular px-5 py-3"
            >
              <Plus size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text className="mt-6 text-sm font-medium text-[var(--text-muted)]">
            {discreetLabel(discreet, "Or use an existing repository", "Or use existing")}
          </Text>
          <TextInput
            value={existingOwner}
            onChangeText={setExistingOwner}
            className="mt-2 rounded-button bg-[var(--bg-primary)] px-4 py-3 text-[var(--text-primary)]"
            placeholder={sync.username ?? "owner"}
            placeholderTextColor="#8E8C8A"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            value={existingRepo}
            onChangeText={setExistingRepo}
            className="mt-2 rounded-button bg-[var(--bg-primary)] px-4 py-3 text-[var(--text-primary)]"
            placeholder="repository-name"
            placeholderTextColor="#8E8C8A"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            onPress={() =>
              sync.useExistingRepo(
                existingOwner.trim() || sync.username || "",
                existingRepo.trim(),
              )
            }
            disabled={sync.busy || !existingRepo.trim()}
            className={cn(
              "mt-4 rounded-button px-6 py-3",
              existingRepo.trim() ? "bg-follicular" : "bg-[var(--border-light)]",
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
          </TouchableOpacity>
        </View>
      )}

      {sync.connected && sync.config && (
        <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] px-5 py-6">
          <View className="flex-row items-center gap-3">
            <Cloud size={24} color="#7BA891" />
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
            <View className="h-2.5 w-2.5 rounded-full bg-follicular" />
          </View>

          <TouchableOpacity
            onPress={() => sync.syncNow()}
            disabled={sync.syncing}
            className="mt-6 flex-row items-center justify-center gap-2 rounded-button bg-follicular px-6 py-4"
          >
            {sync.syncing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <RefreshCw size={18} color="#fff" />
            )}
            <Text className="font-semibold text-white">
              {discreetLabel(discreet, "Sync Now", "Sync Now")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleDisconnect()}
            disabled={sync.busy}
            className="mt-3 flex-row items-center justify-center gap-2 rounded-button bg-[var(--border-light)] px-6 py-4"
          >
            <Trash2 size={18} color="#EF4444" />
            <Text className="font-semibold text-red-500">
              {discreetLabel(discreet, "Disconnect", "Disconnect")}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )
}
