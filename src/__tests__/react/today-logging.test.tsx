import { fireEvent, render, screen } from "@testing-library/react-native"
import TodayScreen from "@/app/(tabs)/index"
import { useDayLogs } from "@/hooks/use-day-logs"
import { saveDayEntry } from "@/domain/day-entry"
import { router } from "expo-router"
import type { DayLog } from "@/types/day-log"

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  useFocusEffect: jest.fn(),
}))
jest.mock("nativewind", () => ({ useColorScheme: () => ({ colorScheme: "light" }) }))
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0 }),
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("lucide-react-native", () => ({ X: () => null, Trash2: () => null }))
jest.mock("@/components/day-circle", () => ({ DayCircle: () => null }))
jest.mock("@/hooks/use-theme-colors", () => ({ useThemeColors: () => ({}) }))
jest.mock("@/hooks/use-cycles", () => ({
  useCycles: () => ({ currentCycle: null, isLoaded: true }),
}))
jest.mock("@/hooks/use-settings", () => ({ useSettings: () => ({ avgCycleLength: 28 }) }))
jest.mock("@/hooks/use-predictions", () => ({
  usePrediction: () => ({ prediction: null, phase: "follicular", periodLength: 3 }),
}))
jest.mock("@/hooks/use-cycle-day-states", () => ({ useCycleDayStates: () => new Map() }))
jest.mock("@/hooks/use-day-logs", () => ({ useDayLogs: jest.fn() }))
jest.mock("@/domain/day-entry", () => ({
  saveDayEntry: jest.fn().mockResolvedValue(undefined),
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
    upsertDayLog: jest.fn(),
    deleteDayLog: jest.fn(),
    getLogForDate: (date) => logs.find((log) => log.date === date) ?? null,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers().setSystemTime(new Date(2026, 5, 5, 12))
  setLogs([prior])
})
afterEach(() => jest.useRealTimers())

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
