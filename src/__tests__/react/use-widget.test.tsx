import { renderHook } from "@testing-library/react-native"
import { useWidget } from "@/hooks/use-widget"
import { refreshWidget } from "@/services/widget"
import { recomputePrediction } from "@/stores/prediction-store"

let mockBundle = { prediction: null }
jest.mock("@xstate/store-react", () => ({ useSelector: () => mockBundle }))
jest.mock("@/hooks/use-settings", () => ({
  useSettings: () => ({ discreetMode: false }),
}))
jest.mock("@/services/widget", () => ({
  refreshWidget: jest.fn().mockResolvedValue(undefined),
}))
jest.mock("@/services/logger", () => ({ logger: { warn: jest.fn() } }))
jest.mock("@/stores/prediction-store", () => ({
  predictionStore: {},
  recomputePrediction: jest.fn(),
}))

test("widget refresh is downstream, not a prediction trigger", async () => {
  jest.clearAllMocks()
  const view = await renderHook(useWidget)
  expect(refreshWidget).toHaveBeenCalledTimes(1)
  mockBundle = { prediction: null }
  await view.rerender(undefined)
  expect(refreshWidget).toHaveBeenCalledTimes(2)
  expect(recomputePrediction).not.toHaveBeenCalled()
})
