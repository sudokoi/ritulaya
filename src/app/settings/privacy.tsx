import { View, Text, ScrollView, Pressable } from "react-native"
import { router } from "expo-router"
import { ChevronLeft } from "lucide-react-native"
import Markdown from "react-native-markdown-display"
import { useColorScheme } from "nativewind"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import privacyMarkdown from "../../../privacy.md"
import { discreetLabel } from "@/lib/discreet"
import { useSettings } from "@/hooks/use-settings"
import { useThemeColors } from "@/hooks/use-theme-colors"
import { palette } from "@/constants/palette"
import { PHASE_COLORS } from "@/constants/phase-colors"

const markdownStyles = {
  body: { fontSize: 15, lineHeight: 23 },
  heading1: { fontSize: 20, fontWeight: "700" as const, marginVertical: 8 },
  heading2: { fontSize: 17, fontWeight: "700" as const, marginVertical: 6 },
  heading3: { fontSize: 15, fontWeight: "600" as const, marginVertical: 4 },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { marginVertical: 2 },
  link: { textDecorationLine: "underline" as const },
  paragraph: { marginVertical: 6 },
}

export default function PrivacyScreen() {
  const { discreetMode: discreet } = useSettings()
  const { colorScheme } = useColorScheme()
  const { muted } = useThemeColors()
  const insets = useSafeAreaInsets()
  const dark = colorScheme === "dark"
  const textColor = dark ? palette.dark.textPrimary : palette.light.textPrimary
  const linkColor = dark ? PHASE_COLORS.follicular.darkHex : PHASE_COLORS.follicular.hex

  const styles = {
    ...markdownStyles,
    body: { ...markdownStyles.body, color: textColor },
    heading1: { ...markdownStyles.heading1, color: textColor },
    heading2: { ...markdownStyles.heading2, color: textColor },
    heading3: { ...markdownStyles.heading3, color: textColor },
    link: { ...markdownStyles.link, color: linkColor },
  }

  return (
    <View className="flex-1 bg-[var(--bg-primary)]">
      <View
        className="flex-row items-center gap-2 px-4 pb-2"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Pressable
          onPress={() => router.back()}
          className="p-2 active:opacity-60"
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ChevronLeft size={24} color={muted} />
        </Pressable>
        <Text className="text-2xl font-bold text-[var(--text-primary)]">
          {discreetLabel(discreet, "Privacy Policy", "Policy")}
        </Text>
      </View>
      <ScrollView className="flex-1 px-6 pb-12">
        <Markdown style={styles}>{privacyMarkdown.replace(/\r\n/g, "\n")}</Markdown>
      </ScrollView>
    </View>
  )
}
