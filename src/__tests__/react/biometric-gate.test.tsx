import { Text } from "react-native"
import { act, render, screen, fireEvent } from "@testing-library/react-native"
import * as LocalAuthentication from "expo-local-authentication"
import { BiometricGate } from "@/components/biometric-gate"

jest.mock("lucide-react-native", () => ({ Fingerprint: () => null }))
jest.mock("@/hooks/use-theme-colors", () => ({ useThemeColors: () => ({}) }))
jest.mock("@/hooks/use-settings", () => ({
  useSettings: () => ({ biometricLock: true }),
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

beforeEach(() => jest.useFakeTimers())
afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
})

test("locked content renders only after successful authentication", async () => {
  jest
    .spyOn(LocalAuthentication, "authenticateAsync")
    .mockResolvedValue({ success: true })
  await render(
    <BiometricGate>
      <Text>private history</Text>
    </BiometricGate>,
  )
  expect(screen.queryByText("private history")).toBeNull()
  await act(async () => jest.advanceTimersByTime(250))
  expect(screen.getByText("private history")).toBeTruthy()
})

test("unavailable biometrics do not offer an unauthenticated lock bypass", async () => {
  jest
    .spyOn(LocalAuthentication, "authenticateAsync")
    .mockResolvedValue({ success: false, error: "not_available" })
  await render(
    <BiometricGate>
      <Text>private history</Text>
    </BiometricGate>,
  )
  await fireEvent.press(screen.getByLabelText("gate.unlock"))
  expect(screen.queryByText("private history")).toBeNull()
  expect(screen.queryByText("gate.turnOffLock")).toBeNull()
  expect(screen.getByText("gate.unavailable")).toBeTruthy()
})
