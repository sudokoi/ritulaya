import { Tabs } from "expo-router"
import { Calendar, Home, Settings } from "lucide-react-native"
import { Pressable } from "react-native"
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
          backgroundColor: "#faf8f5",
          borderTopColor: "#e8e4df",
          elevation: 0,
          shadowOpacity: 0,
          shadowColor: "transparent",
        },
        tabBarActiveTintColor: "#7BA891",
        tabBarInactiveTintColor: "#8E8C8A",
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
