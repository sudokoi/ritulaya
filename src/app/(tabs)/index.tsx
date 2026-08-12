import { View, Text, ScrollView } from "react-native"

export default function TodayScreen() {
  return (
    <ScrollView className="flex-1 bg-[var(--bg-primary)]">
      <View className="items-center justify-center px-6 pt-12 pb-8">
        <Text className="text-7xl font-bold text-[var(--text-primary)]">14</Text>
        <Text className="mt-2 text-xl font-medium text-follicular">Ovulation Phase</Text>
        <View className="mt-4 h-1 w-48 overflow-hidden rounded-full bg-[var(--border-light)]">
          <View className="h-full w-1/2 rounded-full bg-follicular" />
        </View>
        <Text className="mt-2 text-sm text-[var(--text-muted)]">
          14 days until next period
        </Text>
      </View>

      <View className="mx-4 rounded-card bg-[var(--bg-surface)] p-5">
        <Text className="text-lg font-semibold text-[var(--text-primary)]">
          Quick Log
        </Text>
        <View className="mt-4 flex-row justify-center gap-2">
          {["●", "●", "●", "○", "○"].map((dot, i) => (
            <View
              key={i}
              className={`h-8 w-8 items-center justify-center rounded-full ${
                i < 3 ? "bg-follicular" : "bg-[var(--border-light)]"
              }`}
            >
              <Text className="text-white text-sm">{dot}</Text>
            </View>
          ))}
        </View>
        <View className="mt-4 flex-row flex-wrap gap-2">
          {["Cramps", "Happy", "Tired"].map((chip) => (
            <View key={chip} className="rounded-full bg-[var(--border-light)] px-4 py-2">
              <Text className="text-sm text-[var(--text-primary)]">{chip}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] p-5">
        <Text className="text-lg font-semibold text-[var(--text-primary)]">
          This Week
        </Text>
        <View className="mt-3 flex-row justify-between">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
            <View key={i} className="items-center gap-1">
              <Text className="text-xs text-[var(--text-muted)]">{day}</Text>
              <View
                className={`h-2 w-2 rounded-full ${
                  i >= 1 && i <= 4 ? "bg-menstrual" : "bg-[var(--border-light)]"
                }`}
              />
            </View>
          ))}
        </View>
      </View>

      <View className="mx-4 mt-4 mb-8 rounded-card bg-follicular/10 p-5">
        <Text className="text-sm font-medium text-follicular">
          Your energy peaks now. Great time for intense workouts & social plans.
        </Text>
      </View>
    </ScrollView>
  )
}
