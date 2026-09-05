import { AppState, Text, type AppStateStatus } from "react-native"
import { act, render, screen, fireEvent } from "@testing-library/react-native"
import {
  authenticate,
  isAuthenticationCurrent,
  cancelAuthentication,
} from "@/services/authentication"
import type { AuthenticationResult } from "../../../modules/ritulaya-auth"
import { BiometricGate } from "@/components/biometric-gate"

jest.mock("@/services/authentication", () => ({
  authenticate: jest.fn(),
  isAuthenticationCurrent: jest.fn(),
  cancelAuthentication: jest.fn(async () => undefined),
}))
jest.mock("lucide-react-native", () => ({ Fingerprint: () => null }))
jest.mock("@/hooks/use-theme-colors", () => ({ useThemeColors: () => ({}) }))
jest.mock("@/hooks/use-settings", () => ({
  useSettings: () => ({ biometricLock: true }),
}))
jest.mock("react-i18next", () => {
  const t = (key: string) => key
  return { useTranslation: () => ({ t }) }
})

let changeState: (state: AppStateStatus) => void
const originalAppState = AppState.currentState
const success = { success: true, token: "native-grant" } as const
beforeEach(() => {
  jest.useFakeTimers()
  jest.clearAllMocks()
  AppState.currentState = "active"
  jest.mocked(authenticate).mockResolvedValue(success)
  jest.mocked(isAuthenticationCurrent).mockReturnValue(true)
  jest.spyOn(AppState, "addEventListener").mockImplementation((_event, listener) => {
    changeState = listener
    return { remove: jest.fn() }
  })
})
afterEach(() => {
  AppState.currentState = originalAppState
  jest.useRealTimers()
  jest.restoreAllMocks()
})
async function mountGate() {
  return render(
    <BiometricGate>
      <Text>private history</Text>
    </BiometricGate>,
  )
}

test("locked content requires both native success and a current grant", async () => {
  await mountGate()
  expect(screen.queryByText("private history")).toBeNull()
  await act(async () => jest.advanceTimersByTime(250))
  expect(screen.getByText("private history")).toBeTruthy()
  expect(isAuthenticationCurrent).toHaveBeenCalledWith("native-grant")
})

test("unavailable authentication does not offer an unauthenticated bypass", async () => {
  jest.mocked(authenticate).mockResolvedValue({ success: false, error: "unavailable" })
  await mountGate()
  await fireEvent.press(screen.getByLabelText("gate.unlock"))
  expect(screen.queryByText("private history")).toBeNull()
  expect(screen.queryByText("gate.turnOffLock")).toBeNull()
  expect(screen.getByText("gate.unavailable")).toBeTruthy()
})

test.each([true, false])(
  "valid credential return unlocks before/after resume: %s",
  async (resumeFirst) => {
    let finish!: (result: AuthenticationResult) => void
    jest.mocked(authenticate).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    await mountGate()
    await act(async () => jest.advanceTimersByTime(250))
    await act(async () => changeState("background"))
    if (resumeFirst) await act(async () => changeState("active"))
    await act(async () => finish(success))
    if (!resumeFirst) {
      expect(screen.queryByText("private history")).toBeNull()
      await act(async () => changeState("active"))
    }
    expect(screen.getByText("private history")).toBeTruthy()
    await act(async () => jest.advanceTimersByTime(500))
    expect(authenticate).toHaveBeenCalledTimes(1)
  },
)

test.each([true, false])(
  "a stale queued success never unlocks before/after resume: %s",
  async (resumeFirst) => {
    let finish!: (result: AuthenticationResult) => void
    jest
      .mocked(authenticate)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finish = resolve
        }),
      )
      .mockResolvedValue({ success: false, error: "cancelled" })
    await mountGate()
    await act(async () => jest.advanceTimersByTime(250))
    jest.mocked(isAuthenticationCurrent).mockReturnValue(false)
    await act(async () => changeState("background"))
    if (resumeFirst) await act(async () => changeState("active"))
    await act(async () => finish(success))
    if (!resumeFirst) await act(async () => changeState("active"))
    expect(screen.queryByText("private history")).toBeNull()
    await act(async () => jest.advanceTimersByTime(500))
    expect(screen.queryByText("private history")).toBeNull()
  },
)

test("an unlocked gate relocks and rechecks its grant when returning", async () => {
  await mountGate()
  await act(async () => jest.advanceTimersByTime(250))
  expect(screen.getByText("private history")).toBeTruthy()
  jest.mocked(isAuthenticationCurrent).mockReturnValue(false)
  await act(async () => changeState("background"))
  expect(screen.queryByText("private history")).toBeNull()
  await act(async () => changeState("active"))
  expect(screen.queryByText("private history")).toBeNull()
})

test("unmount cancels authentication and ignores its late completion", async () => {
  let finish!: (result: AuthenticationResult) => void
  jest.mocked(authenticate).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  const view = await mountGate()
  await act(async () => jest.advanceTimersByTime(250))
  await view.unmount()
  await act(async () => finish(success))
  expect(cancelAuthentication).toHaveBeenCalled()
  expect(isAuthenticationCurrent).not.toHaveBeenCalled()
})

test.each([true, false])(
  "credential cancellation before/after resume waits for explicit retry: %s",
  async (resumeFirst) => {
    let finish!: (result: AuthenticationResult) => void
    jest.mocked(authenticate).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    await mountGate()
    await act(async () => jest.advanceTimersByTime(250))
    await act(async () => changeState("background"))
    if (resumeFirst) await act(async () => changeState("active"))
    await act(async () => finish({ success: false, error: "cancelled" }))
    if (!resumeFirst) await act(async () => changeState("active"))
    await act(async () => jest.advanceTimersByTime(1000))
    expect(authenticate).toHaveBeenCalledTimes(1)
    expect(screen.queryByText("private history")).toBeNull()
    await fireEvent.press(screen.getByLabelText("gate.unlock"))
    expect(authenticate).toHaveBeenCalledTimes(2)
  },
)
