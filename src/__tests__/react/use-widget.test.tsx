import { renderHook } from "@testing-library/react-native"
import { useWidget } from "@/hooks/use-widget"
import { refreshWidget } from "@/services/widget"
import { recomputePrediction } from "@/stores/prediction-store"

jest.mock("@/hooks/use-predictions", () => ({
  usePrediction: () => ({ prediction: null }),
}))
jest.mock("@/hooks/use-settings", () => ({
  useSettings: () => ({ discreetMode: false }),
}))
jest.mock("@/services/widget", () => ({
  refreshWidget: jest.fn().mockResolvedValue(undefined),
}))
jest.mock("@/services/logger", () => ({ logger: { warn: jest.fn() } }))
jest.mock("@/stores/prediction-store", () => ({ recomputePrediction: jest.fn() }))

test("widget refresh is downstream, not a prediction trigger", async () => {
  await renderHook(useWidget)
  expect(refreshWidget).toHaveBeenCalledTimes(1)
  expect(recomputePrediction).not.toHaveBeenCalled()
})
