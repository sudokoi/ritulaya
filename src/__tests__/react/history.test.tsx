import { Alert } from "react-native"
import { fireEvent, render, screen } from "@testing-library/react-native"
import HistoryScreen from "@/app/history"
import { dayLogStore, loadDayLogs } from "@/stores/day-log-store"
import { refreshAll } from "@/data/refresh"
import * as db from "@/services/db"
import { useSettings } from "@/hooks/use-settings"
import type { DayLog } from "@/types/day-log"

jest.mock("expo-router", () => ({
  router: { canGoBack: jest.fn(), back: jest.fn(), replace: jest.fn() },
}))
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { date?: string }) =>
      options?.date ? `${key} ${options.date}` : key,
  }),
}))
jest.mock("lucide-react-native", () => ({
  X: () => null,
  Trash2: () => null,
  ChevronLeft: () => null,
}))
jest.mock("@/hooks/use-theme-colors", () => ({ useThemeColors: () => ({}) }))
jest.mock("@/hooks/use-settings", () => ({
  useSettings: jest.fn(() => ({ discreetMode: false })),
}))
jest.mock("@/hooks/use-predictions", () => ({
  usePrediction: () => ({ periodLength: 3 }),
}))
jest.mock("@/services/logger", () => ({ logger: { error: jest.fn() } }))
jest.mock("@/services/db", () => ({
  listDayLogs: jest.fn(),
  saveDayEntry: jest.fn(),
  deleteDayLog: jest.fn(),
}))
jest.mock("@/data/refresh", () => ({ refreshAll: jest.fn() }))

const base: DayLog = {
  id: "first",
  date: "2026-06-01",
  cycleId: null,
  flowIntensity: "medium",
  symptoms: ["cramps"],
  mood: "calm",
  notes: "Coffee after lunch",
  cervicalMucus: null,
  bbt: null,
  sexualActivity: 0,
  createdAt: "",
  updatedAt: "",
}
let persisted: DayLog[]

beforeEach(async () => {
  jest.clearAllMocks()
  persisted = [
    base,
    {
      ...base,
      id: "second",
      date: "2026-06-05",
      mood: "sad",
      symptoms: ["headache"],
      notes: "Long walk",
    },
  ]
  jest.mocked(db.listDayLogs).mockImplementation(async () => persisted)
  jest.mocked(db.saveDayEntry).mockImplementation(async (input) => {
    const existing = persisted.find((entry) => entry.date === input.date) ?? {
      ...base,
      id: "new",
      date: input.date,
    }
    const updated = { ...existing, notes: input.notes || null }
    persisted = [...persisted.filter((entry) => entry.id !== updated.id), updated]
    return updated
  })
  jest.mocked(db.deleteDayLog).mockImplementation(async (id) => {
    persisted = persisted.filter((entry) => entry.id !== id)
  })
  jest.mocked(refreshAll).mockImplementation(loadDayLogs)
  await loadDayLogs()
})

test("search and combined filters select the correct entries, and Clear restores them", async () => {
  await render(<HistoryScreen />)
  expect(
    screen
      .getAllByRole("button", { name: /^history.editDate/ })
      .map((row) => row.props.accessibilityLabel),
  ).toEqual(["history.editDate Jun 5, 2026", "history.editDate Jun 1, 2026"])
  await fireEvent.changeText(screen.getByLabelText("history.searchNotes"), "COFFEE")
  expect(screen.getByText("Coffee after lunch")).toBeTruthy()
  expect(screen.queryByText("Long walk")).toBeNull()
  await fireEvent.press(screen.getByRole("button", { name: "history.filters" }))
  await fireEvent.press(screen.getByRole("button", { name: "symptoms.cramps" }))
  await fireEvent.press(screen.getByRole("button", { name: "moods.calm" }))
  await fireEvent.changeText(screen.getByLabelText("history.fromDate"), "2026-06-01")
  await fireEvent.changeText(screen.getByLabelText("history.toDate"), "2026-06-01")
  expect(screen.getByText("Coffee after lunch")).toBeTruthy()
  await fireEvent.press(screen.getByRole("button", { name: "moods.sad" }))
  expect(screen.getByText("history.noResults")).toBeTruthy()
  await fireEvent.press(screen.getByRole("button", { name: "history.clearFilters" }))
  expect(screen.getByText("Coffee after lunch")).toBeTruthy()
  expect(screen.getByText("Long walk")).toBeTruthy()
  expect(screen.getByLabelText("history.searchNotes")).toHaveDisplayValue("")
})

test("an invalid range is explained instead of presented as an empty search", async () => {
  await render(<HistoryScreen />)
  await fireEvent.press(screen.getByRole("button", { name: "history.filters" }))
  await fireEvent.changeText(screen.getByLabelText("history.fromDate"), "2026-02-30")
  expect(screen.getByRole("alert")).toHaveTextContent("history.invalidDate")
  expect(screen.queryByText("history.noResults")).toBeNull()
  await fireEvent.changeText(screen.getByLabelText("history.fromDate"), "2026-06-05")
  await fireEvent.changeText(screen.getByLabelText("history.toDate"), "2026-06-01")
  expect(screen.getByRole("alert")).toHaveTextContent("history.reversedRange")
})

test("a result opens its existing draft and a saved edit refreshes the active search", async () => {
  await render(<HistoryScreen />)
  await fireEvent.changeText(screen.getByLabelText("history.searchNotes"), "coffee")
  await fireEvent.press(
    screen.getByRole("button", { name: "history.editDate Jun 1, 2026" }),
  )
  expect(screen.getByDisplayValue("Coffee after lunch")).toBeTruthy()
  await fireEvent.changeText(screen.getByLabelText("sheet.notes"), "Tea after lunch")
  await fireEvent.press(screen.getByLabelText("sheet.saveEntry"))
  expect(db.saveDayEntry).toHaveBeenCalledWith(
    expect.objectContaining({ date: "2026-06-01", notes: "Tea after lunch" }),
    3,
  )
  expect(screen.queryByLabelText("sheet.saveEntry")).toBeNull()
  expect(screen.getByLabelText("history.searchNotes")).toHaveDisplayValue("coffee")
  expect(screen.getByText("history.noResults")).toBeTruthy()
  await fireEvent.press(screen.getByRole("button", { name: "history.clearFilters" }))
  expect(screen.getByText("Tea after lunch")).toBeTruthy()
})

test("failed edits keep the draft open and do not publish an updated search result", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined)
  jest.mocked(db.saveDayEntry).mockRejectedValueOnce(new Error("disk full"))
  await render(<HistoryScreen />)
  await fireEvent.press(
    screen.getByRole("button", { name: "history.editDate Jun 1, 2026" }),
  )
  await fireEvent.changeText(screen.getByLabelText("sheet.notes"), "Keep this draft")
  await fireEvent.press(screen.getByLabelText("sheet.saveEntry"))
  expect(screen.getByDisplayValue("Keep this draft")).toBeTruthy()
  expect(refreshAll).not.toHaveBeenCalled()
  expect(alert).toHaveBeenCalledWith(
    "calendar.saveFailedTitle",
    "calendar.saveFailedBody",
  )
  alert.mockRestore()
})

test("deleting a result uses the shared command and removes it from history", async () => {
  await render(<HistoryScreen />)
  await fireEvent.press(
    screen.getByRole("button", { name: "history.editDate Jun 1, 2026" }),
  )
  await fireEvent.press(screen.getByLabelText("sheet.deleteEntry"))
  expect(db.deleteDayLog).toHaveBeenCalledWith("first")
  expect(
    screen.queryByRole("button", { name: "history.editDate Jun 1, 2026" }),
  ).toBeNull()
  expect(screen.getByText("Long walk")).toBeTruthy()
})

test("an empty history offers logging instead of fabricated or predicted entries", async () => {
  dayLogStore.send({ type: "setLogs", logs: [] })
  await render(<HistoryScreen />)
  expect(screen.getByText("history.emptyTitle")).toBeTruthy()
  await fireEvent.press(screen.getByRole("button", { name: "today.logToday" }))
  expect(screen.getByLabelText("sheet.notes")).toHaveDisplayValue("")
})

test("discreet mode leaves entry details out of history previews", async () => {
  jest
    .mocked(useSettings)
    .mockReturnValueOnce({ discreetMode: true } as ReturnType<typeof useSettings>)
  await render(<HistoryScreen />)
  expect(screen.queryByText("Coffee after lunch")).toBeNull()
  expect(screen.queryByText("Long walk")).toBeNull()
  expect(screen.getAllByText("history.privatePreview")).toHaveLength(2)
  expect(screen.getAllByRole("button", { name: /^history.editDate/ })).toHaveLength(2)
})
