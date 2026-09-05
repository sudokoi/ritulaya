import { Text } from "react-native"
import { render, screen, fireEvent, act } from "@testing-library/react-native"
import { AppBootstrap } from "@/components/app-bootstrap"
import { refreshAll } from "@/data/refresh"

jest.mock("@/data/refresh", () => ({ refreshAll: jest.fn() }))
jest.mock("@/services/logger", () => ({ logger: { error: jest.fn() } }))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

test("protected content waits for all data, including on a cold deep link", async () => {
  let finish!: () => void
  jest.mocked(refreshAll).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  await render(
    <AppBootstrap>
      <Text>existing entry</Text>
    </AppBootstrap>,
  )
  expect(screen.queryByText("existing entry")).toBeNull()
  await act(async () => finish())
  expect(screen.getByText("existing entry")).toBeTruthy()
})

test("failed initialization stays closed and can be retried", async () => {
  jest.mocked(refreshAll).mockRejectedValueOnce(new Error("database unavailable"))
  await render(
    <AppBootstrap>
      <Text>protected</Text>
    </AppBootstrap>,
  )
  expect(screen.queryByText("protected")).toBeNull()
  jest.mocked(refreshAll).mockResolvedValueOnce(undefined)
  await fireEvent.press(screen.getByText("gate.tryAgain"))
  expect(screen.getByText("protected")).toBeTruthy()
})
