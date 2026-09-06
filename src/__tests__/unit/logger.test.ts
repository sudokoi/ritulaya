import { logger } from "@/services/logger"
import RitulayaLogger from "../../../modules/ritulaya-logger"

jest.mock("../../../modules/ritulaya-logger", () => ({
  __esModule: true,
  default: { log: jest.fn() },
}))

test("a rejected native diagnostic write never becomes an unhandled application failure", async () => {
  if (!RitulayaLogger) throw new Error("Missing logger test double")
  jest
    .mocked(RitulayaLogger.log)
    .mockRejectedValueOnce(new Error("diagnostic disk unavailable"))
  logger.warn("app", "Refresh failed")
  await new Promise<void>((resolve) => setImmediate(resolve))
  expect(RitulayaLogger.log).toHaveBeenCalledWith("warn", "app", "Refresh failed", null)
})

test("non-serializable metadata cannot throw into a user command", () => {
  const metadata: { self?: unknown } = {}
  metadata.self = metadata
  expect(() => logger.warn("app", "Refresh failed", metadata)).not.toThrow()
})
