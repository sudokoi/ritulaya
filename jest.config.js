const expoPreset = require("jest-expo/jest-preset")

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
      // Exercise the real store subscriptions in React tests; both packages are ESM.
      transformIgnorePatterns: expoPreset.transformIgnorePatterns.map((pattern) =>
        pattern.replace(
          "/node_modules/",
          "/node_modules/(?!@xstate/(?:store|store-react)/)",
        ),
      ),
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
      testMatch: ["<rootDir>/src/__tests__/react/**/*.test.{ts,tsx}"],
    },
  ],
}
