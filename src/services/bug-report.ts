import * as Clipboard from "expo-clipboard"
import { Alert, Linking } from "react-native"
import { logger } from "@/services/logger"

const REPO_URL = "https://github.com/sudokoi/ritulaya"

export async function reportBug() {
  const logs = await logger.exportLogs()

  if (logs) {
    await Clipboard.setStringAsync(logs)
  }

  Alert.alert(
    "Report a Bug",
    "Device logs (app diagnostics only — no cycle or health data) were copied to your clipboard. Paste them into the GitHub issue that opens.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Open GitHub",
        onPress: () => {
          void Linking.openURL(`${REPO_URL}/issues/new`)
        },
      },
    ],
  )
}
