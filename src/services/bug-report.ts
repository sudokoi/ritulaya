import * as Clipboard from "expo-clipboard"
import { Alert, Linking } from "react-native"
import { logger } from "@/services/logger"
import i18n from "@/i18n"

const REPO_URL = "https://github.com/sudokoi/ritulaya"

export async function reportBug() {
  const logs = await logger.exportLogs()

  if (logs) {
    await Clipboard.setStringAsync(logs)
  }

  Alert.alert(i18n.t("bugReport.title"), i18n.t("bugReport.message"), [
    { text: i18n.t("common.cancel"), style: "cancel" },
    {
      text: i18n.t("bugReport.openGithub"),
      onPress: () => {
        void Linking.openURL(`${REPO_URL}/issues/new`)
      },
    },
  ])
}
