import { Tabs } from "expo-router"
import { Calendar, Home, Settings } from "lucide-react-native"
import { Pressable } from "react-native"
import { useColorScheme } from "nativewind"
import { palette } from "@/constants/palette"
import type { BottomTabBarButtonProps } from "expo-router/build/react-navigation/bottom-tabs"

function TabBarButton({
  children,
  style,
  onPress,
  onLongPress,
  href: _href,
  pressColor: _pressColor,
  pressOpacity: _pressOpacity,
  hoverEffect: _hoverEffect,
  ref: _ref,
  ...rest
}: BottomTabBarButtonProps) {
  return (
    <Pressable
      {...rest}
      onPress={onPress}
      onLongPress={onLongPress}
      android_ripple={null}
      style={({ pressed }) => [
        style,
        { flex: 1, alignItems: "center", justifyContent: "center" },
        pressed && { opacity: 0.55 },
      ]}
    >
      {children}
    </Pressable>
  )
}

export default function TabLayout() {
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === "dark"
  const colors = dark ? palette.dark : palette.light

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: TabBarButton,
        tabBarLabelPosition: "below-icon",
        tabBarItemStyle: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        },
        tabBarStyle: {
          backgroundColor: colors.bgPrimary,
          borderTopColor: colors.border,
          elevation: 0,
          shadowOpacity: 0,
          shadowColor: "transparent",
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
