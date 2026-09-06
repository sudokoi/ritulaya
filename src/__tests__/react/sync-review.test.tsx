import { act, fireEvent, render, screen, userEvent } from "@testing-library/react-native"
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

const synced = {
  status: "inSync" as const,
  syncedAt: null,
  warning: false,
  consecutiveFailures: 0,
}

beforeEach(() => {
  jest.useFakeTimers()
  jest.clearAllMocks()
  jest.mocked(getSyncReview).mockReset()
  jest.mocked(resolveSyncReview).mockReset().mockResolvedValue(undefined)
  jest.mocked(syncNowAction).mockReset().mockResolvedValue(synced)
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
  expect(screen.getByText("syncV2.migrationBody")).toBeVisible()
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

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

test("migration shows progress through approval, sync and review refresh", async () => {
  const approval = deferred<undefined>()
  const sync = deferred<Awaited<ReturnType<typeof syncNowAction>>>()
  const refresh = deferred<Awaited<ReturnType<typeof getSyncReview>>>()
  jest
    .mocked(getSyncReview)
    .mockResolvedValueOnce({ id: "review", kind: "migration", conflicts: [] })
    .mockReturnValueOnce(refresh.promise)
  jest.mocked(resolveSyncReview).mockReturnValueOnce(approval.promise)
  jest.mocked(syncNowAction).mockReturnValueOnce(sync.promise)
  await render(<SyncReviewScreen />)
  expect(screen.queryByRole("progressbar")).toBeNull()
  await fireEvent.press(screen.getByRole("button", { name: "syncV2.approve" }))
  expect(screen.getByRole("progressbar", { name: "sync.statusSyncing" })).toBeVisible()
  expect(
    screen.getByRole("button", { name: "sync.statusSyncing", busy: true }),
  ).toBeDisabled()
  expect(screen.getByRole("button", { name: "common.back" })).toBeDisabled()
  await fireEvent.press(screen.getByRole("button", { name: "sync.statusSyncing" }))
  expect(resolveSyncReview).toHaveBeenCalledTimes(1)
  expect(syncNowAction).not.toHaveBeenCalled()

  await act(async () => approval.resolve(undefined))
  expect(syncNowAction).toHaveBeenCalledTimes(1)
  expect(screen.getByRole("progressbar")).toBeVisible()
  await act(async () => sync.resolve(synced))
  expect(getSyncReview).toHaveBeenCalledTimes(2)
  expect(screen.getByRole("progressbar")).toBeVisible()
  await act(async () => refresh.resolve(null))
  expect(screen.queryByRole("progressbar")).toBeNull()
  expect(screen.getByText("syncV2.noReview")).toBeVisible()
})

test("failed migration clears progress and retry displays it again", async () => {
  const sync = deferred<Awaited<ReturnType<typeof syncNowAction>>>()
  jest
    .mocked(getSyncReview)
    .mockResolvedValue({ id: "review", kind: "migration", conflicts: [] })
  jest.mocked(syncNowAction).mockReturnValueOnce(sync.promise)
  await render(<SyncReviewScreen />)
  await fireEvent.press(screen.getByRole("button", { name: "syncV2.approve" }))
  expect(screen.getByRole("progressbar")).toBeVisible()
  await act(async () => sync.resolve({ ...synced, status: "error" }))
  expect(screen.queryByRole("progressbar")).toBeNull()
  expect(screen.getByRole("alert")).toHaveTextContent("syncV2.failed")
  expect(screen.getByRole("button", { name: "syncV2.approve" })).toBeEnabled()

  const retry = deferred<Awaited<ReturnType<typeof syncNowAction>>>()
  jest.mocked(syncNowAction).mockReturnValueOnce(retry.promise)
  await userEvent.press(screen.getByRole("button", { name: "gate.tryAgain" }))
  expect(screen.getByRole("progressbar")).toBeVisible()
  await act(async () => retry.resolve({ ...synced, status: "error" }))
  expect(screen.queryByRole("progressbar")).toBeNull()
  expect(screen.getByRole("alert")).toHaveTextContent("syncV2.failed")
})

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
