import { act, fireEvent, render, screen } from "@testing-library/react-native"
import TodayScreen from "@/app/(tabs)/index"
import { useDayLogs } from "@/hooks/use-day-logs"
import { saveDayEntry, deleteDayEntry, clearDayEntryFlow } from "@/domain/day-entry"
import { router, useFocusEffect } from "expo-router"
import type { DayLog } from "@/types/day-log"
import { useCycles } from "@/hooks/use-cycles"
import { usePrediction } from "@/hooks/use-predictions"
import { useSettings } from "@/hooks/use-settings"

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  useFocusEffect: jest.fn(),
}))
jest.mock("nativewind", () => ({ useColorScheme: () => ({ colorScheme: "light" }) }))
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0 }),
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: "en-US" },
  }),
}))
jest.mock("lucide-react-native", () => ({ Check: () => null }))
jest.mock("@/components/day-circle", () => ({ DayCircle: () => null }))
jest.mock("@/hooks/use-theme-colors", () => ({ useThemeColors: () => ({}) }))
jest.mock("@/hooks/use-cycles", () => ({
  useCycles: jest.fn(() => ({ currentCycle: null, isLoaded: true })),
}))
jest.mock("@/hooks/use-settings", () => ({
  useSettings: jest.fn(() => ({ avgCycleLength: 28, discreetMode: false })),
}))
jest.mock("@/hooks/use-predictions", () => ({
  usePrediction: jest.fn(() => ({
    prediction: null,
    phase: "follicular",
    periodLength: 3,
  })),
}))
jest.mock("@/hooks/use-cycle-day-states", () => ({ useCycleDayStates: () => new Map() }))
jest.mock("@/hooks/use-day-logs", () => ({ useDayLogs: jest.fn() }))
jest.mock("@/domain/day-entry", () => ({
  saveDayEntry: jest.fn().mockResolvedValue(undefined),
  deleteDayEntry: jest.fn().mockResolvedValue(undefined),
  clearDayEntryFlow: jest.fn().mockResolvedValue(undefined),
}))
jest.mock("@/data/refresh", () => ({ refreshAll: jest.fn() }))

const prior: DayLog = {
  id: "entry",
  date: "2026-06-03",
  cycleId: null,
  flowIntensity: "none",
  symptoms: [],
  mood: null,
  notes: "earlier note",
  cervicalMucus: null,
  bbt: null,
  sexualActivity: 0,
  createdAt: "",
  updatedAt: "",
}

function setLogs(logs: DayLog[]) {
  jest.mocked(useDayLogs).mockReturnValue({
    logs,
    todayLog: logs.find((log) => log.date === "2026-06-05") ?? null,
    loaded: true,
    loadDayLogs: jest.fn(),
    getLogForDate: (date) => logs.find((log) => log.date === date) ?? null,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers().setSystemTime(new Date(2026, 5, 5, 12))
  jest
    .mocked(useCycles)
    .mockReturnValue({ cycles: [], currentCycle: null, isLoaded: true, load: jest.fn() })
  setLogs([prior])
  jest.mocked(useSettings).mockReturnValue({ ...useSettings(), discreetMode: false })
})
afterEach(() => jest.useRealTimers())

test("refocusing after midnight does not show yesterday's cached entry as today's", async () => {
  setLogs([{ ...prior, date: "2026-06-05", notes: "Yesterday's entry" }])
  await render(<TodayScreen />)
  expect(screen.getByText("Yesterday's entry")).toBeTruthy()
  jest.setSystemTime(new Date(2026, 5, 6, 0, 5))
  await act(async () => {
    const onFocus = jest.mocked(useFocusEffect).mock.calls.at(-1)?.[0]
    if (!onFocus) throw new Error("Today did not register its focus callback")
    onFocus()
  })
  expect(screen.queryByText("Yesterday's entry")).toBeNull()
  expect(screen.getByRole("button", { name: "today.logToday" })).toBeTruthy()
  await fireEvent.press(screen.getByRole("button", { name: "today.logToday" }))
  expect(screen.getByLabelText("sheet.notes")).toHaveDisplayValue("")
})

test("Today explains missing cycle history instead of displaying a dash and inferred phase", async () => {
  jest.mocked(usePrediction).mockReturnValueOnce({
    phase: "menstrual",
    periodLength: 3,
    avgCycleLength: 28,
    stats: null,
    prediction: {
      nextPeriodStart: new Date(2026, 6, 1),
      nextPeriodEnd: new Date(2026, 6, 3),
      ovulationDay: new Date(2026, 5, 17),
      fertileWindow: { start: new Date(2026, 5, 12), end: new Date(2026, 5, 18) },
      uncertaintyWindow: { start: new Date(2026, 5, 28), end: new Date(2026, 6, 4) },
      confidence: 0.2,
      cyclesUsed: 0,
      engine: "wma",
    },
  })
  await render(<TodayScreen />)
  expect(screen.queryByText("-")).toBeNull()
  expect(screen.getByText("today.noCycleTitle")).toBeTruthy()
  expect(screen.getByText("today.noCycleBody")).toBeTruthy()
  expect(screen.queryByText("today.roughlyDaysUntil")).toBeNull()
  expect(screen.queryByText("phase.menstrual.name")).toBeNull()
  expect(screen.queryByText("phase.menstrual.tip")).toBeNull()
  expect(screen.queryByText("today.couldStart")).toBeNull()
  expect(screen.getByRole("button", { name: "today.logToday" })).toBeTruthy()
  expect(screen.getByRole("button", { name: "today.setupTitle" })).toBeTruthy()
})

test.each([0, 23])(
  "a recorded cycle shows its real calendar-day number at hour %i",
  async (hour) => {
    jest.setSystemTime(new Date(2026, 5, 5, hour, 30))
    const cycle = {
      id: "cycle",
      startDate: "2026-06-03",
      endDate: null,
      createdAt: "",
      updatedAt: "",
    }
    jest.mocked(useCycles).mockReturnValue({
      cycles: [cycle],
      currentCycle: cycle,
      isLoaded: true,
      load: jest.fn(),
    })
    await render(<TodayScreen />)
    expect(screen.getByLabelText("today.cycleDay 3")).toHaveTextContent("3")
    expect(screen.getByText("today.cycleDay")).toBeTruthy()
    expect(screen.queryByText("today.noCycleTitle")).toBeNull()
    // A missing prediction must not produce the old hardcoded 14-day countdown.
    expect(screen.queryByText("today.roughlyDaysUntil")).toBeNull()
  },
)

test("a future period start is not presented as cycle day one today", async () => {
  const cycle = {
    id: "cycle",
    startDate: "2026-06-06",
    endDate: null,
    createdAt: "",
    updatedAt: "",
  }
  jest.mocked(useCycles).mockReturnValue({
    cycles: [cycle],
    currentCycle: cycle,
    isLoaded: true,
    load: jest.fn(),
  })
  await render(<TodayScreen />)
  expect(screen.getByText("today.noCycleTitle")).toBeTruthy()
  expect(screen.queryByText("today.cycleDay")).toBeNull()
})

test("Log today opens and saves today's editor without visiting Calendar", async () => {
  await render(<TodayScreen />)
  await fireEvent.press(screen.getByRole("button", { name: "today.logToday" }))
  await fireEvent.changeText(screen.getByLabelText("sheet.notes"), "today's note")
  await fireEvent.press(screen.getByLabelText("sheet.saveEntry"))
  expect(saveDayEntry).toHaveBeenCalledWith(
    expect.objectContaining({ date: "2026-06-05", notes: "today's note" }),
    3,
  )
  expect(router.push).not.toHaveBeenCalled()
  expect(screen.queryByLabelText("sheet.saveEntry")).toBeNull()
})

test("one tap on a week date opens its existing entry", async () => {
  await render(<TodayScreen />)
  await fireEvent.press(screen.getByRole("button", { name: "Wed, Jun 3" }))
  expect(screen.getByDisplayValue("earlier note")).toBeTruthy()
  await fireEvent.press(screen.getByLabelText("sheet.saveEntry"))
  expect(saveDayEntry).toHaveBeenCalledWith(
    expect.objectContaining({ date: "2026-06-03", notes: "earlier note" }),
    3,
  )
  expect(router.push).not.toHaveBeenCalled()
})

test("an existing entry gets an explicit Edit today action", async () => {
  setLogs([{ ...prior, date: "2026-06-05" }])
  await render(<TodayScreen />)
  await fireEvent.press(screen.getByRole("button", { name: "today.editToday" }))
  expect(screen.getByDisplayValue("earlier note")).toBeTruthy()
})

test("deleting from Today uses the shared day-entry command", async () => {
  await render(<TodayScreen />)
  await fireEvent.press(screen.getByRole("button", { name: "Wed, Jun 3" }))
  await fireEvent.press(screen.getByLabelText("sheet.deleteEntry"))
  expect(deleteDayEntry).toHaveBeenCalledWith("entry")
  expect(screen.queryByLabelText("sheet.saveEntry")).toBeNull()
})

test("Today provides a discoverable history entry point", async () => {
  await render(<TodayScreen />)
  await fireEvent.press(screen.getByRole("button", { name: "history.open" }))
  expect(router.push).toHaveBeenCalledWith("/history")
})

test("clearing flow from Today uses the shared day-entry command", async () => {
  setLogs([{ ...prior, flowIntensity: "medium" }])
  await render(<TodayScreen />)
  await fireEvent.press(screen.getByRole("button", { name: "Wed, Jun 3" }))
  await fireEvent.press(screen.getByLabelText("sheet.removePeriod"))
  expect(clearDayEntryFlow).toHaveBeenCalledWith("2026-06-03")
  expect(screen.queryByLabelText("sheet.saveEntry")).toBeNull()
})

test("Today shows one note summary and discreet mode hides it until the editor is opened", async () => {
  setLogs([{ ...prior, date: "2026-06-05" }])
  const view = await render(<TodayScreen />)
  expect(screen.getAllByText("earlier note")).toHaveLength(1)
  jest.mocked(useSettings).mockReturnValue({ ...useSettings(), discreetMode: true })
  await view.rerender(<TodayScreen />)
  expect(screen.queryByText("earlier note")).toBeNull()
  expect(screen.queryByText("today.noCycleTitle")).toBeNull()
  expect(screen.getByText("today.privateTitle")).toBeTruthy()
  await fireEvent.press(screen.getByRole("button", { name: "today.openEntry" }))
  expect(screen.getByDisplayValue("earlier note")).toBeTruthy()
})
