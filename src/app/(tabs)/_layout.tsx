import { Tabs } from "expo-router"
import { Calendar, Home, Settings } from "lucide-react-native"

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
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
