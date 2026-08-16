module.exports = {
  projects: [
    {
      displayName: "unit",
      testEnvironment: "node",
      transform: {
        "^.+\\.tsx?$": ["@swc/jest"],
        "^.+\\.jsx?$": ["@swc/jest"],
      },
      transformIgnorePatterns: ["node_modules/(?!date-fns)"],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      testMatch: ["<rootDir>/src/__tests__/unit/**/*.test.ts"],
    },
    {
      displayName: "react",
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
      testMatch: ["<rootDir>/src/__tests__/react/**/*.test.{ts,tsx}"],
    },
  ],
}
