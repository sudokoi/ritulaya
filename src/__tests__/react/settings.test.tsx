import { Alert } from "react-native"
import { act, fireEvent, render, screen } from "@testing-library/react-native"
import { router } from "expo-router"
import * as LocalAuthentication from "expo-local-authentication"
import SettingsScreen from "@/app/(tabs)/settings"
import { settingsStore, loadSettings } from "@/stores/settings-store"
import * as db from "@/services/db"
import { requestNotificationPermissions } from "@/services/notifications"

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }))
jest.mock("@/services/db", () => ({
  findSettings: jest.fn(async () => null),
  updateSettings: jest.fn(async () => undefined),
}))
jest.mock("@/hooks/use-predictions", () => ({
  usePrediction: () => ({ avgCycleLength: 28, periodLength: 3 }),
}))
jest.mock("@/hooks/use-sync", () => ({ useSync: () => ({ config: null }) }))
jest.mock("@/hooks/use-theme-colors", () => ({ useThemeColors: () => ({}) }))
jest.mock("@/services/export", () => ({ exportData: jest.fn() }))
jest.mock("@/services/bug-report", () => ({ reportBug: jest.fn() }))
jest.mock("@/services/notifications", () => ({
  requestNotificationPermissions: jest.fn(async () => true),
}))
jest.mock("@/i18n", () => ({
  SUPPORTED_LOCALES: ["en-US", "en-GB", "en-IN", "hi", "ja", "ko"],
}))
jest.mock("expo-local-authentication", () => ({
  hasHardwareAsync: jest.fn(async () => false),
  isEnrolledAsync: jest.fn(async () => false),
}))
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0 }),
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) =>
      options?.count ? `${key} ${options.count}` : key,
  }),
}))
jest.mock("lucide-react-native", () =>
  Object.fromEntries(
    [
      "Shield",
      "EyeOff",
      "Download",
      "Bell",
      "Smartphone",
      "ChevronRight",
      "Languages",
      "Cloud",
      "Info",
      "Bug",
      "Check",
    ].map((key) => [key, () => null]),
  ),
)

beforeEach(async () => {
  jest.clearAllMocks()
  jest.spyOn(Alert, "alert").mockImplementation(() => undefined)
  await loadSettings()
})

test("theme and language disclosure does not write until an explicit option is chosen", async () => {
  await render(<SettingsScreen />)
  await fireEvent.press(
    screen.getByRole("button", { name: "settings.theme, settings.themeSystem" }),
  )
  expect(db.updateSettings).not.toHaveBeenCalled()
  await fireEvent.press(screen.getByRole("button", { name: "settings.themeDark" }))
  expect(db.updateSettings).toHaveBeenLastCalledWith({ theme: "dark" })
  expect(
    screen.getByRole("button", { name: "settings.themeDark", selected: true }),
  ).toBeTruthy()
  await fireEvent.press(
    screen.getByRole("button", { name: "settings.language, settings.system" }),
  )
  await fireEvent.press(screen.getByRole("button", { name: "settings.langJa" }))
  expect(db.updateSettings).toHaveBeenLastCalledWith({ language: "ja" })
  expect(requestNotificationPermissions).not.toHaveBeenCalled()
})

test("the labeled switch row blocks duplicate writes and only changes after persistence", async () => {
  let finish!: () => void
  jest.mocked(db.updateSettings).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  await render(<SettingsScreen />)
  const toggle = screen.getByRole("switch", {
    name: "settings.discreetMode",
    checked: false,
  })
  await fireEvent.press(toggle)
  await fireEvent.press(toggle)
  expect(db.updateSettings).toHaveBeenCalledTimes(1)
  expect(db.updateSettings).toHaveBeenCalledWith({ discreetMode: 1 })
  expect(settingsStore.getSnapshot().context.discreetMode).toBe(false)
  await act(async () => finish())
  expect(
    screen.getByRole("switch", { name: "discreet.discreetMode", checked: true }),
  ).toBeTruthy()
  expect(screen.queryByText("28")).toBeNull()
})

test("failed settings writes retain the previous value and allow retry", async () => {
  jest.mocked(db.updateSettings).mockRejectedValueOnce(new Error("disk full"))
  await render(<SettingsScreen />)
  await fireEvent.press(screen.getByRole("switch", { name: "settings.discreetMode" }))
  expect(
    screen.getByRole("switch", { name: "settings.discreetMode", checked: false }),
  ).toBeTruthy()
  expect(Alert.alert).toHaveBeenCalledWith(
    "settings.saveFailedTitle",
    "settings.saveFailedBody",
  )
  await fireEvent.press(screen.getByRole("switch", { name: "settings.discreetMode" }))
  expect(
    screen.getByRole("switch", { name: "discreet.discreetMode", checked: true }),
  ).toBeTruthy()
})

test("enabling a reminder requires permission, while turning it off does not", async () => {
  jest.mocked(requestNotificationPermissions).mockResolvedValueOnce(false)
  await render(<SettingsScreen />)
  await fireEvent.press(screen.getByRole("switch", { name: "settings.dailyLog" }))
  expect(db.updateSettings).not.toHaveBeenCalled()
  expect(Alert.alert).toHaveBeenCalledWith(
    "settings.permissionTitle",
    "settings.permissionBody",
  )
  await fireEvent.press(
    screen.getByRole("button", { name: "settings.periodAhead, common.days 2" }),
  )
  await fireEvent.press(screen.getByRole("button", { name: "common.off" }))
  expect(requestNotificationPermissions).toHaveBeenCalledTimes(1)
  expect(db.updateSettings).toHaveBeenLastCalledWith({ reminderPeriodAhead: 0 })
})

test("unavailable biometrics and hardware errors never enable the lock", async () => {
  await render(<SettingsScreen />)
  await fireEvent.press(screen.getByRole("switch", { name: "settings.biometricLock" }))
  expect(db.updateSettings).not.toHaveBeenCalled()
  expect(Alert.alert).toHaveBeenCalledWith(
    "settings.biometricsUnavailableTitle",
    "settings.biometricsUnavailableBody",
  )
  jest
    .mocked(LocalAuthentication.hasHardwareAsync)
    .mockRejectedValueOnce(new Error("unavailable"))
  await fireEvent.press(screen.getByRole("switch", { name: "settings.biometricLock" }))
  expect(db.updateSettings).not.toHaveBeenCalled()
  expect(Alert.alert).toHaveBeenLastCalledWith(
    "settings.saveFailedTitle",
    "settings.saveFailedBody",
  )
})

test("cycle-length editing and insights are separate navigation actions", async () => {
  await render(<SettingsScreen />)
  await fireEvent.press(screen.getByRole("button", { name: "settings.viewInsights" }))
  expect(router.push).toHaveBeenCalledTimes(1)
  expect(router.push).toHaveBeenLastCalledWith("/settings/insights")
  await fireEvent.press(screen.getByRole("button", { name: "settings.adjustCycle" }))
  expect(router.push).toHaveBeenLastCalledWith({
    pathname: "/seed",
    params: { mode: "settings" },
  })
})
