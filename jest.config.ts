import type { Config } from "jest"

const config: Config = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!(" +
      "expo-router|@react-native|react-native|" +
      "expo-font|expo-constants|expo-linking|expo-status-bar|" +
      "@expo/vector-icons" +
      ")/)",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
}

export default config
