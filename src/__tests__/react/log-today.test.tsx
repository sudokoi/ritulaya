import { act, fireEvent, render, screen } from "@testing-library/react-native"
import { router } from "expo-router"
import LogTodayScreen from "@/app/log-today"
import { saveDayEntry } from "@/domain/day-entry"

jest.mock("expo-router", () => ({
  router: { canGoBack: jest.fn(() => false), back: jest.fn(), replace: jest.fn() },
}))
jest.mock("lucide-react-native", () => ({ Check: () => null }))
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 0 }),
}))
jest.mock("@/hooks/use-theme-colors", () => ({ useThemeColors: () => ({}) }))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("@/hooks/use-predictions", () => ({
  usePrediction: () => ({ periodLength: 3 }),
}))
jest.mock("@/hooks/use-day-logs", () => ({
  useDayLogs: () => ({ getLogForDate: () => null }),
}))
jest.mock("@/domain/day-entry", () => ({
  saveDayEntry: jest.fn().mockResolvedValue(undefined),
}))

beforeEach(() => jest.clearAllMocks())

test("widget logging uses the shared command and navigates only after it completes", async () => {
  let finish!: () => void
  jest.mocked(saveDayEntry).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  await render(<LogTodayScreen />)
  await fireEvent.changeText(screen.getByLabelText("sheet.notes"), "Widget draft")
  await fireEvent.press(screen.getByLabelText("sheet.saveEntry"))
  expect(saveDayEntry).toHaveBeenCalledWith(
    expect.objectContaining({ notes: "Widget draft" }),
    3,
  )
  expect(router.replace).not.toHaveBeenCalled()
  expect(router.back).not.toHaveBeenCalled()
  await act(async () => finish())
  expect(router.replace).toHaveBeenCalledWith("/(tabs)")
})

test("a failed widget save retains the draft and does not navigate away", async () => {
  jest.mocked(saveDayEntry).mockRejectedValueOnce(new Error("disk full"))
  await render(<LogTodayScreen />)
  await fireEvent.changeText(screen.getByLabelText("sheet.notes"), "Keep widget draft")
  await fireEvent.press(screen.getByLabelText("sheet.saveEntry"))
  expect(screen.getByDisplayValue("Keep widget draft")).toBeTruthy()
  expect(router.replace).not.toHaveBeenCalled()
  expect(router.back).not.toHaveBeenCalled()
  expect(screen.getByRole("alert")).toHaveTextContent(/calendar.saveFailedTitle/)
})
