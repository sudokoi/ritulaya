import { act, fireEvent, render, screen } from "@testing-library/react-native"
import SyncReviewScreen from "@/app/settings/sync-review"
import { getSyncReview, resolveSyncReview } from "@/services/sync"
import { syncNowAction } from "@/stores/sync-store"
import { useSettings } from "@/hooks/use-settings"

jest.mock("expo-router", () => ({ router: { back: jest.fn() } }))
jest.mock("lucide-react-native", () => ({ ChevronLeft: () => null }))
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("@/hooks/use-theme-colors", () => ({ useThemeColors: () => ({}) }))
jest.mock("@/hooks/use-settings", () => ({
  useSettings: jest.fn(() => ({ discreetMode: false })),
}))
jest.mock("@/services/sync", () => ({
  getSyncReview: jest.fn(),
  resolveSyncReview: jest.fn(async () => undefined),
}))
jest.mock("@/stores/sync-store", () => ({
  syncNowAction: jest.fn(async () => ({ status: "inSync" })),
}))

beforeEach(() => {
  jest.useFakeTimers()
  jest.clearAllMocks()
  jest
    .mocked(useSettings)
    .mockReturnValue({ discreetMode: false } as ReturnType<typeof useSettings>)
})
afterEach(async () => {
  await act(async () => jest.runOnlyPendingTimers())
  jest.useRealTimers()
})

test("migration requires explicit confirmation before asking native sync to publish", async () => {
  jest
    .mocked(getSyncReview)
    .mockResolvedValueOnce({ id: "review", kind: "migration", conflicts: [] })
    .mockResolvedValue(null)
  await render(<SyncReviewScreen />)
  expect(resolveSyncReview).not.toHaveBeenCalled()
  await fireEvent.press(screen.getByRole("button", { name: "syncV2.approve" }))
  expect(resolveSyncReview).toHaveBeenCalledWith("review", { migration: "approve" })
  expect(syncNowAction).toHaveBeenCalledTimes(1)
})

const conflict = {
  id: "review",
  kind: "conflicts" as const,
  conflicts: [
    {
      id: "0",
      record: "day:2026-06-01",
      field: "notes",
      local: "private local note",
      remote: "private remote note",
    },
  ],
}

test("publication failure remains visible after choices were saved", async () => {
  jest.mocked(getSyncReview).mockResolvedValue(conflict)
  jest
    .mocked(syncNowAction)
    .mockResolvedValueOnce({ status: "error" } as Awaited<
      ReturnType<typeof syncNowAction>
    >)
  await render(<SyncReviewScreen />)
  await fireEvent.press(screen.getByRole("button", { name: "syncV2.keepRemote" }))
  await fireEvent.press(screen.getByRole("button", { name: "syncV2.apply" }))
  expect(screen.getByText("syncV2.failed")).toBeTruthy()
  expect(screen.queryByText("syncV2.noReview")).toBeNull()
  jest
    .mocked(syncNowAction)
    .mockResolvedValueOnce({ status: "error" } as Awaited<
      ReturnType<typeof syncNowAction>
    >)
  await fireEvent.press(screen.getByRole("button", { name: "gate.tryAgain" }))
  expect(screen.getByText("syncV2.failed")).toBeTruthy()
  expect(getSyncReview).toHaveBeenCalledTimes(1)
})

test("a conflict needs a choice and failed resolution keeps that choice", async () => {
  jest.mocked(getSyncReview).mockResolvedValue(conflict)
  jest.mocked(resolveSyncReview).mockRejectedValueOnce(new Error("review changed"))
  await render(<SyncReviewScreen />)
  expect(screen.getByRole("button", { name: "syncV2.apply" })).toBeDisabled()
  await fireEvent.press(screen.getByRole("button", { name: "syncV2.keepRemote" }))
  await fireEvent.press(screen.getByRole("button", { name: "syncV2.apply" }))
  expect(resolveSyncReview).toHaveBeenCalledWith("review", { "0": "remote" })
  expect(syncNowAction).not.toHaveBeenCalled()
  expect(screen.getByText("syncV2.failed")).toBeTruthy()
  expect(
    screen.getByRole("button", { name: "syncV2.keepRemote", selected: true }),
  ).toBeTruthy()
})

test("discreet review does not expose conflict values until explicitly opened", async () => {
  jest
    .mocked(useSettings)
    .mockReturnValue({ discreetMode: true } as ReturnType<typeof useSettings>)
  jest.mocked(getSyncReview).mockResolvedValue(conflict)
  await render(<SyncReviewScreen />)
  expect(screen.queryByText("private local note")).toBeNull()
  expect(screen.queryByText("private remote note")).toBeNull()
  await fireEvent.press(screen.getByRole("button", { name: "syncV2.reveal" }))
  expect(screen.getByText("private local note")).toBeTruthy()
})
