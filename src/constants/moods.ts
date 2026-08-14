export const MOOD_CATALOG = [
  { key: "happy", emoji: "😊", label: "Happy" },
  { key: "calm", emoji: "😌", label: "Calm" },
  { key: "energetic", emoji: "⚡", label: "Energetic" },
  { key: "anxious", emoji: "😰", label: "Anxious" },
  { key: "sad", emoji: "😢", label: "Sad" },
  { key: "angry", emoji: "😤", label: "Angry" },
  { key: "irritable", emoji: "😠", label: "Irritable" },
  { key: "tired", emoji: "😴", label: "Tired" },
  { key: "loved", emoji: "🥰", label: "Loved" },
] as const

export type MoodKey = (typeof MOOD_CATALOG)[number]["key"]
