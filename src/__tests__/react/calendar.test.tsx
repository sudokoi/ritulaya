import { fireEvent, render, screen } from "@testing-library/react-native"
import CalendarScreen from "@/app/(tabs)/calendar"
import { useSettings } from "@/hooks/use-settings"
import { saveDayEntry } from "@/domain/day-entry"
import { router } from "expo-router"

let mockLanguage = "en-US"

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }))
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}))
jest.mock("nativewind", () => ({ useColorScheme: () => ({ colorScheme: "dark" }) }))
jest.mock("lucide-react-native", () => ({
  ChevronLeft: () => null,
  ChevronRight: () => null,
  Check: () => null,
}))
jest.mock("@/components/day-circle", () => ({ DayCircle: () => null }))
jest.mock("@/hooks/use-theme-colors", () => ({ useThemeColors: () => ({}) }))
jest.mock("@/hooks/use-settings", () => ({
  useSettings: jest.fn(() => ({ discreetMode: false })),
}))
jest.mock("@/hooks/use-predictions", () => ({
  usePrediction: () => ({ periodLength: 3, avgCycleLength: 28 }),
}))
jest.mock("@/hooks/use-day-logs", () => ({
  useDayLogs: () => ({ getLogForDate: () => null }),
}))
jest.mock("@/hooks/use-cycle-day-states", () => ({
  useCycleDayStates: () => new Map([["2026-09-03", { period: true, logged: true }]]),
}))
jest.mock("@/domain/day-entry", () => ({ saveDayEntry: jest.fn(async () => undefined) }))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: mockLanguage },
  }),
}))

beforeEach(() => {
  mockLanguage = "en-US"
  jest.clearAllMocks()
  jest.useFakeTimers({
    now: new Date(2026, 8, 5, 12),
    doNotFake: ["setImmediate", "setTimeout"],
  })
})
afterEach(() => jest.useRealTimers())

test("changing language reformats the mounted grid without resetting its viewed month", async () => {
  const view = await render(<CalendarScreen />)
  await fireEvent.press(screen.getByRole("button", { name: "calendar.nextMonth" }))
  expect(screen.getByRole("header", { name: "October 2026" })).toBeTruthy()
  mockLanguage = "hi"
  await view.rerender(<CalendarScreen />)
  expect(screen.getByRole("header", { name: "अक्टूबर 2026" })).toBeTruthy()
  expect(screen.queryByRole("header", { name: "October 2026" })).toBeNull()
})

test("month navigation and Today preserve direct date editing", async () => {
  await render(<CalendarScreen />)
  await fireEvent.press(screen.getByRole("button", { name: "calendar.prevMonth" }))
  expect(screen.getByRole("header", { name: "August 2026" })).toBeTruthy()
  await fireEvent.press(screen.getByRole("button", { name: "calendar.nextMonth" }))
  await fireEvent.press(screen.getByRole("button", { name: "calendar.nextMonth" }))
  expect(screen.getByRole("header", { name: "October 2026" })).toBeTruthy()
  await fireEvent.press(screen.getByRole("button", { name: "calendar.today" }))
  expect(screen.getByRole("header", { name: "September 2026" })).toBeTruthy()
  await fireEvent.press(
    screen.getByRole("button", { name: /Thursday, September 3rd, 2026/ }),
  )
  await fireEvent.changeText(screen.getByLabelText("sheet.notes"), "Calendar draft")
  await fireEvent.press(screen.getByLabelText("sheet.saveEntry"))
  expect(saveDayEntry).toHaveBeenCalledWith(
    expect.objectContaining({ date: "2026-09-03", notes: "Calendar draft" }),
    3,
  )
})

test("Calendar retains history navigation and described day states", async () => {
  await render(<CalendarScreen />)
  expect(
    screen.getByRole("button", {
      name: /September 3rd.*calendar.statePeriod.*calendar.stateLogged/,
    }),
  ).toBeTruthy()
  await fireEvent.press(screen.getByRole("button", { name: "history.open" }))
  expect(router.push).toHaveBeenCalledWith("/history")
})

test("discreet Calendar omits health labels and estimates but still opens entries", async () => {
  jest
    .mocked(useSettings)
    .mockReturnValueOnce({ discreetMode: true } as ReturnType<typeof useSettings>)
  await render(<CalendarScreen />)
  expect(screen.queryByText("calendar.avgCycle")).toBeNull()
  expect(screen.queryByText("calendar.legendPeriod")).toBeNull()
  expect(screen.queryByRole("button", { name: /calendar.statePeriod/ })).toBeNull()
  await fireEvent.press(
    screen.getByRole("button", { name: "Thursday, September 3rd, 2026" }),
  )
  expect(screen.getByLabelText("sheet.notes")).toBeTruthy()
})
