import { render, fireEvent, screen } from "@testing-library/react-native"
import { router, useLocalSearchParams } from "expo-router"
import SeedCycleScreen from "@/app/seed"
import { logPeriodOnDate } from "@/domain/day-entry"
import { useSettings } from "@/hooks/use-settings"

jest.mock("expo-router", () => ({
  router: { back: jest.fn() },
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
  useSafeAreaInsets: () => ({ top: 0 }),
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

test("adjusting lengths from Settings never records a period", async () => {
  const update = jest.fn().mockResolvedValue(undefined)
  jest.mocked(useLocalSearchParams).mockReturnValue({ mode: "settings" })
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
  await render(<SeedCycleScreen />)
  expect(screen.queryByText("seed.lastPeriodStarted")).toBeNull()
  await fireEvent.press(screen.getByRole("button", { name: "common.save" }))
  expect(update).toHaveBeenCalledWith({ avgCycleLength: 28, avgPeriodLength: 3 })
  expect(logPeriodOnDate).not.toHaveBeenCalled()
  expect(router.back).toHaveBeenCalledTimes(1)
})
