import { fireEvent, render, screen } from "@testing-library/react-native"
import RepairHistoryScreen from "@/app/settings/repair-history"
import { applyCycleRepair, previewCycleRepair } from "@/services/db"

jest.mock("expo-router", () => ({ router: { back: jest.fn() } }))
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("@/hooks/use-settings", () => ({
  useSettings: () => ({ discreetMode: false }),
}))
jest.mock("@/hooks/use-date-locale", () => ({ useDateLocale: () => undefined }))
jest.mock("@/data/refresh", () => ({ refreshAll: jest.fn() }))
jest.mock("@/services/db", () => ({
  previewCycleRepair: jest.fn(),
  applyCycleRepair: jest.fn(),
}))

test("historical repair is preview-only until confirmation and stale failure requires re-preview", async () => {
  jest.mocked(previewCycleRepair).mockResolvedValue({
    token: "inspected",
    before: [
      {
        id: "old",
        startDate: "2026-06-01",
        endDate: null,
        createdAt: "",
        updatedAt: "",
      },
    ],
    after: [],
    reassociatedEntries: 1,
  })
  jest.mocked(applyCycleRepair).mockRejectedValueOnce(new Error("stale preview"))
  await render(<RepairHistoryScreen />)
  expect(applyCycleRepair).not.toHaveBeenCalled()
  expect(screen.getByText("repair.before")).toBeTruthy()
  await fireEvent.press(screen.getByRole("button", { name: "repair.confirm" }))
  expect(applyCycleRepair).toHaveBeenCalledWith("inspected")
  expect(screen.getByText("syncV2.failed")).toBeTruthy()
  expect(screen.getByRole("button", { name: "repair.confirm" })).toBeDisabled()
  await fireEvent.press(screen.getByRole("button", { name: "gate.tryAgain" }))
  expect(previewCycleRepair).toHaveBeenCalledTimes(2)
  expect(screen.getByRole("button", { name: "repair.confirm" })).not.toBeDisabled()
})
