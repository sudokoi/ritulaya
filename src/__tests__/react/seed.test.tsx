import { render, fireEvent, screen, act } from "@testing-library/react-native"
import { router, useLocalSearchParams } from "expo-router"
import SeedCycleScreen from "@/app/seed"
import { logPeriodOnDate } from "@/domain/day-entry"
import { useSettings } from "@/hooks/use-settings"
import { Alert } from "react-native"

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: jest.fn(),
}))
jest.mock("@/hooks/use-settings", () => ({ useSettings: jest.fn() }))
jest.mock("@/domain/day-entry", () => ({
  logPeriodOnDate: jest.fn().mockResolvedValue(undefined),
}))
jest.mock("@/hooks/use-theme-colors", () => ({ useThemeColors: () => ({}) }))
jest.mock("lucide-react-native", () => ({
  ChevronLeft: () => null,
  Minus: () => null,
  Plus: () => null,
}))
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

beforeEach(() => {
  jest.clearAllMocks()
  const update = jest.fn().mockResolvedValue(undefined)
  jest.mocked(useLocalSearchParams).mockReturnValue({})
  jest.mocked(useSettings).mockReturnValue({
    avgCycleLength: 28,
    avgPeriodLength: 3,
    lutealPhaseLength: 14,
    theme: "system",
    language: "en",
    biometricLock: false,
    discreetMode: false,
    reminderPeriodAhead: 2,
    reminderDailyLog: false,
    loaded: true,
    error: null,
    load: jest.fn(),
    update,
  })
})

test("adjusting lengths from Settings never records a period", async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ mode: "settings" })
  await render(<SeedCycleScreen />)
  expect(screen.queryByText("seed.lastPeriodStarted")).toBeNull()
  await fireEvent.press(screen.getByRole("button", { name: "common.save" }))
  expect(jest.mocked(useSettings).mock.results[0].value.update).toHaveBeenCalledWith({
    avgCycleLength: 28,
    avgPeriodLength: 3,
  })
  expect(logPeriodOnDate).not.toHaveBeenCalled()
  expect(router.back).toHaveBeenCalledTimes(1)
})

test("setup offers a direct logging handoff only after persistence succeeds", async () => {
  let finish!: () => void
  jest.mocked(logPeriodOnDate).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  await render(<SeedCycleScreen />)
  await fireEvent.press(screen.getByRole("button", { name: "common.save" }))
  expect(screen.queryByText("seed.completeTitle")).toBeNull()
  await act(async () => finish())
  expect(screen.getByText("seed.completeTitle")).toBeTruthy()
  expect(screen.queryByRole("button", { name: "common.save" })).toBeNull()
  await fireEvent.press(screen.getByRole("button", { name: "today.logToday" }))
  expect(router.replace).toHaveBeenCalledWith("/log-today")
  expect(logPeriodOnDate).toHaveBeenCalledTimes(1)
})

test("setup also allows exploring without opening a log editor", async () => {
  await render(<SeedCycleScreen />)
  await fireEvent.press(screen.getByRole("button", { name: "common.save" }))
  await fireEvent.press(screen.getByRole("button", { name: "seed.exploreApp" }))
  expect(router.replace).toHaveBeenCalledWith("/(tabs)")
})

test("failed setup stays on the form instead of offering a completion handoff", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined)
  jest.mocked(logPeriodOnDate).mockRejectedValueOnce(new Error("disk full"))
  await render(<SeedCycleScreen />)
  await fireEvent.press(screen.getByRole("button", { name: "common.save" }))
  expect(screen.queryByText("seed.completeTitle")).toBeNull()
  expect(screen.getByRole("button", { name: "common.save" })).toBeEnabled()
  expect(router.replace).not.toHaveBeenCalled()
  expect(router.back).not.toHaveBeenCalled()
  expect(alert).toHaveBeenCalledWith("seed.saveFailedTitle", "seed.saveFailedBody")
  alert.mockRestore()
})
