import { render, screen } from "@testing-library/react-native"
import InsightsScreen from "@/app/settings/insights"
import { useSettings } from "@/hooks/use-settings"
import { ja as mockLocale } from "date-fns/locale"

jest.mock("expo-router", () => ({ router: { back: jest.fn() } }))
jest.mock("lucide-react-native", () => ({ ChevronLeft: () => null }))
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("@/hooks/use-date-locale", () => ({ useDateLocale: () => mockLocale }))
jest.mock("@/hooks/use-theme-colors", () => ({ useThemeColors: () => ({}) }))
jest.mock("@/hooks/use-settings", () => ({
  useSettings: jest.fn(() => ({
    discreetMode: false,
    avgCycleLength: 28,
    avgPeriodLength: 3,
    lutealPhaseLength: 14,
  })),
}))
jest.mock("@/hooks/use-predictions", () => ({
  usePrediction: () => ({ periodLength: 3, stats: null }),
}))
jest.mock("@/hooks/use-cycles", () => ({
  useCycles: () => ({
    cycles: [
      { id: "cycle", startDate: "2026-06-01", endDate: "2026-06-28" },
      { id: "next", startDate: "2026-06-29", endDate: null },
    ],
  }),
}))
jest.mock("@/hooks/use-day-logs", () => ({
  useDayLogs: () => ({
    logs: [{ date: "2026-06-01", symptoms: ["cramps"], mood: "calm" }],
  }),
}))

test("insights uses the selected date locale and removes all health summaries in discreet mode", async () => {
  const view = await render(<InsightsScreen />)
  expect(screen.getAllByText("symptoms.cramps").length).toBeGreaterThan(0)
  expect(screen.getByText("2026/06/01")).toBeTruthy()
  jest
    .mocked(useSettings)
    .mockReturnValue({ discreetMode: true } as ReturnType<typeof useSettings>)
  await view.rerender(<InsightsScreen />)
  expect(screen.queryByText("symptoms.cramps")).toBeNull()
  expect(screen.queryByText("calendar.avgCycle")).toBeNull()
  expect(screen.queryByText("2026/06/01")).toBeNull()
  expect(screen.getByText("discreet.overviewHidden")).toBeTruthy()
})
