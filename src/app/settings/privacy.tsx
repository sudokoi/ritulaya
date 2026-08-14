import { View, Text, ScrollView, TouchableOpacity } from "react-native"
import { router } from "expo-router"
import { ChevronLeft } from "lucide-react-native"
import Markdown from "react-native-markdown-display"
import privacyMarkdown from "../../../privacy.md"
import { discreetLabel } from "@/lib/discreet"
import { useSettings } from "@/hooks/use-settings"

const markdownStyles = {
  body: { color: "#2d2d2f", fontSize: 15, lineHeight: 23 },
  heading1: { color: "#2d2d2f", fontSize: 20, fontWeight: "700", marginVertical: 8 },
  heading2: { color: "#2d2d2f", fontSize: 17, fontWeight: "700", marginVertical: 6 },
  heading3: { color: "#2d2d2f", fontSize: 15, fontWeight: "600", marginVertical: 4 },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { marginVertical: 2 },
  link: { color: "#7BA891", textDecorationLine: "underline" },
  paragraph: { marginVertical: 6 },
} as const

export default function PrivacyScreen() {
  const { discreetMode: discreet } = useSettings()

  return (
    <View className="flex-1 bg-[var(--bg-primary)]">
      <View className="flex-row items-center gap-2 px-4 pt-14 pb-2">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <ChevronLeft size={24} color="#8E8C8A" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-[var(--text-primary)]">
          {discreetLabel(discreet, "Privacy Policy", "Policy")}
        </Text>
      </View>
      <ScrollView className="flex-1 px-6 pb-12">
        <Markdown style={markdownStyles}>
          {privacyMarkdown.replace(/\r\n/g, "\n")}
        </Markdown>
      </ScrollView>
    </View>
  )
}
