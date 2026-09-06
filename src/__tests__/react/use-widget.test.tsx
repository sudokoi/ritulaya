import { renderHook } from "@testing-library/react-native"
import { useWidget } from "@/hooks/use-widget"
import { refreshWidget } from "@/services/widget"
import { refreshAll } from "@/data/refresh"

let mockBundle = { prediction: null }
jest.mock("@xstate/store-react", () => ({
  useSelector: (_: unknown, selector: (state: unknown) => unknown) =>
    selector({ context: { prediction: mockBundle, refreshFailed: false } }),
}))
jest.mock("@/hooks/use-settings", () => ({
  useSettings: () => ({ discreetMode: false }),
}))
jest.mock("@/services/widget", () => ({
  refreshWidget: jest.fn().mockResolvedValue(undefined),
}))
jest.mock("@/services/logger", () => ({ logger: { warn: jest.fn() } }))
jest.mock("@/data/refresh", () => ({ refreshAll: jest.fn() }))

test("widget refresh is downstream, not a prediction trigger", async () => {
  jest.clearAllMocks()
  const view = await renderHook(useWidget)
  expect(refreshWidget).toHaveBeenCalledTimes(1)
  mockBundle = { prediction: null }
  await view.rerender(undefined)
  expect(refreshWidget).toHaveBeenCalledTimes(2)
  expect(refreshAll).not.toHaveBeenCalled()
})
