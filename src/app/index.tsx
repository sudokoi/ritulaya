import * as Device from "expo-device"
import { StyleSheet } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { AnimatedIcon } from "@/components/animated-icon"
import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme"

function getDevMenuHint() {
  if (Device.isDevice) {
    return (
      <ThemedText type="small">
        shake device or press <ThemedText type="code">m</ThemedText> in terminal
      </ThemedText>
    )
  }
  return (
    <ThemedText type="small">
      press <ThemedText type="code">cmd+m (or ctrl+m)</ThemedText>
    </ThemedText>
  )
}

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroSection}>
          <AnimatedIcon />
          <ThemedText type="title" style={styles.title}>
            Ritulaya
          </ThemedText>
        </ThemedView>

        <ThemedText type="small" style={styles.hint}>
          Dev tools: {getDevMenuHint()}
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    flexDirection: "row",
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: "center",
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  heroSection: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  title: {
    textAlign: "center",
  },
  hint: {
    paddingBottom: Spacing.three,
  },
})
