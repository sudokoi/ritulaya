import eslint from "@eslint/js"
import tseslint from "typescript-eslint"
import reactPlugin from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
import reactNative from "eslint-plugin-react-native"
import { fixupPluginRules } from "@eslint/compat"

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  {
    plugins: {
      react: reactPlugin,
      "react-hooks": fixupPluginRules(reactHooks),
      "react-native": reactNative,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react-native/no-unused-styles": "error",
      "react-native/no-inline-styles": "error",
      "react-native/no-color-literals": "off",
      "react-native/no-raw-text": "off",
      "react/jsx-no-leaked-render": "error",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  {
    ignores: [
      "node_modules/",
      ".expo/",
      "dist/",
      "web-build/",
      "android/",
      "ios/",
      "scripts/",
      "plugins/",
      "*.config.*",
      "assets/",
      ".changeset/",
      "**/build/",
      "**/android/build/",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "react-native/no-unused-styles": "off",
      "react-native/no-inline-styles": "off",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
)
