import { renderHook } from "@testing-library/react-native"
import { useNotifications } from "@/hooks/use-notifications"
import { updateAllReminders } from "@/services/notifications"

jest.mock("@/hooks/use-settings", () => ({
  useSettings: () => ({
    reminderPeriodAhead: 2,
    reminderDailyLog: true,
    discreetMode: false,
    avgCycleLength: 28,
  }),
}))
jest.mock("@/hooks/use-predictions", () => ({
  usePrediction: () => ({ prediction: null }),
}))
jest.mock("@/hooks/use-cycles", () => ({ useCycles: () => ({ currentCycle: null }) }))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "en-US" } }),
}))
jest.mock("@/services/notifications", () => ({
  updateAllReminders: jest.fn(async () => undefined),
}))
jest.mock("@/services/logger", () => ({ logger: { warn: jest.fn() } }))

test("unanchored prediction suppression still preserves the user's daily-log reminder", async () => {
  await renderHook(useNotifications)
  expect(updateAllReminders).toHaveBeenCalledWith(null, 2, true, false, false)
})
