import { Text, TextInput } from "react-native"
import { useState } from "react"
import { act, fireEvent, render, screen } from "@testing-library/react-native"
import { CaptureGate } from "@/components/capture-gate"
import { setCaptureProtected } from "@/services/capture-protection"
import { useSettings } from "@/hooks/use-settings"
import { dataStore } from "@/stores/data-store"
import { refreshAll } from "@/data/refresh"
jest.mock("@/data/refresh", () => ({ refreshAll: jest.fn() }))

jest.mock("@/services/capture-protection", () => ({ setCaptureProtected: jest.fn() }))
jest.mock("@/hooks/use-settings", () => ({ useSettings: jest.fn() }))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

function settings(biometricLock: boolean, discreetMode: boolean) {
  jest
    .mocked(useSettings)
    .mockReturnValue({ biometricLock, discreetMode } as ReturnType<typeof useSettings>)
}
const content = (
  <CaptureGate>
    <Text>health entry</Text>
  </CaptureGate>
)

function Draft() {
  const [text, setText] = useState("")
  return <TextInput accessibilityLabel="draft" value={text} onChangeText={setText} />
}

test("applying a changed policy hides content without discarding its draft", async () => {
  settings(false, false)
  jest.mocked(setCaptureProtected).mockResolvedValueOnce(undefined)
  const view = await render(
    <CaptureGate>
      <Draft />
    </CaptureGate>,
  )
  await fireEvent.changeText(screen.getByLabelText("draft"), "unsaved note")
  let finish!: () => void
  jest.mocked(setCaptureProtected).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  settings(false, true)
  await view.rerender(
    <CaptureGate>
      <Draft />
    </CaptureGate>,
  )
  expect(screen.queryByLabelText("draft")).toBeNull()
  await act(async () => finish())
  expect(screen.getByLabelText("draft")).toHaveDisplayValue("unsaved note")
})

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(setCaptureProtected).mockResolvedValue(undefined)
  dataStore.send({ type: "publish", snapshot: dataStore.getSnapshot().context })
})

test("a pending settings write and refresh hide the retained route until acknowledged", async () => {
  settings(false, false)
  await render(content)
  await act(async () => dataStore.send({ type: "beginSettingsWrite" }))
  expect(screen.queryByText("health entry")).toBeNull()
  expect(setCaptureProtected).toHaveBeenLastCalledWith(true)
  await act(async () => dataStore.send({ type: "beginRefresh" }))
  await act(async () => dataStore.send({ type: "endSettingsWrite" }))
  expect(screen.queryByText("health entry")).toBeNull()
  await act(async () => dataStore.send({ type: "endRefresh" }))
  expect(screen.getByText("health entry")).toBeTruthy()
})

test("a failed post-write refresh hides stale privacy settings until retry succeeds", async () => {
  settings(false, false)
  jest.mocked(setCaptureProtected).mockResolvedValueOnce(undefined)
  await render(content)
  await act(async () => dataStore.send({ type: "refreshFailed" }))
  expect(screen.queryByText("health entry")).toBeNull()
  expect(screen.getByText("bootstrap.failed")).toBeTruthy()
  jest.mocked(refreshAll).mockImplementationOnce(async () => {
    dataStore.send({ type: "publish", snapshot: dataStore.getSnapshot().context })
  })
  await fireEvent.press(screen.getByText("gate.tryAgain"))
  expect(screen.getByText("health entry")).toBeTruthy()
})

test.each([
  [false, false, false],
  [false, true, true],
  [true, false, true],
  [true, true, true],
])(
  "lock=%s discreet=%s waits for capture policy=%s before exposing entries",
  async (lock, discreet, expected) => {
    settings(lock, discreet)
    let finish!: () => void
    jest.mocked(setCaptureProtected).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    await render(content)
    expect(setCaptureProtected).toHaveBeenCalledWith(expected)
    expect(screen.queryByText("health entry")).toBeNull()
    await act(async () => finish())
    expect(screen.getByText("health entry")).toBeTruthy()
  },
)

test("failed native policy stays closed and can be retried", async () => {
  settings(false, true)
  jest.mocked(setCaptureProtected).mockRejectedValueOnce(new Error("no active window"))
  await render(content)
  expect(screen.queryByText("health entry")).toBeNull()
  expect(screen.getByText("gate.captureFailed")).toBeTruthy()
  jest.mocked(setCaptureProtected).mockResolvedValueOnce(undefined)
  await fireEvent.press(screen.getByText("gate.tryAgain"))
  expect(screen.getByText("health entry")).toBeTruthy()
})

test("a late result for the old policy cannot expose the new protected routes", async () => {
  settings(false, false)
  let oldFinish!: () => void
  let newFinish!: () => void
  jest
    .mocked(setCaptureProtected)
    .mockReturnValueOnce(
      new Promise((resolve) => {
        oldFinish = resolve
      }),
    )
    .mockReturnValueOnce(
      new Promise((resolve) => {
        newFinish = resolve
      }),
    )
  const view = await render(content)
  settings(false, true)
  await view.rerender(
    <CaptureGate>
      <Text>new entry</Text>
    </CaptureGate>,
  )
  await act(async () => oldFinish())
  expect(screen.queryByText("new entry")).toBeNull()
  await act(async () => newFinish())
  expect(screen.getByText("new entry")).toBeTruthy()
})
