module.exports = {
  projects: [
    {
      displayName: "unit",
      testEnvironment: "node",
      transform: {
        "^.+\\.tsx?$": ["@swc/jest"],
        "^.+\\.jsx?$": ["@swc/jest"],
      },
      transformIgnorePatterns: ["node_modules/(?!(date-fns|@xstate/store)/)"],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      testMatch: ["<rootDir>/src/__tests__/unit/**/*.test.ts"],
    },
    {
      displayName: "react",
      preset: "jest-expo",
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
      testMatch: ["<rootDir>/src/__tests__/react/**/*.test.{ts,tsx}"],
    },
  ],
}
