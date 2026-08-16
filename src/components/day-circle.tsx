import { View } from "react-native"
import type { ReactNode } from "react"
import { LinearGradient } from "expo-linear-gradient"
import type { DayGradient } from "@/lib/day-colors"

interface DayCircleProps {
  size: number
  fill?: number
  colors?: DayGradient
  opacity?: number
  children?: ReactNode
}

export function DayCircle({
  size,
  fill = 0,
  colors,
  opacity = 1,
  children,
}: DayCircleProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {colors && fill > 0 && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: size * Math.min(fill, 1),
            opacity,
          }}
        >
          <LinearGradient
            colors={colors}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ flex: 1 }}
          />
        </View>
      )}
      <View style={{ alignItems: "center", justifyContent: "center" }}>{children}</View>
    </View>
  )
}
