import { logger } from "@/services/logger"
import RitulayaLogger from "../../../modules/ritulaya-logger"

jest.mock("../../../modules/ritulaya-logger", () => ({
  __esModule: true,
  default: { log: jest.fn().mockResolvedValue(undefined) },
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

test("only allowlisted error categories cross the native bridge", () => {
  if (!RitulayaLogger) throw new Error("Missing logger test double")
  const error = Object.assign(new TypeError("notes=private health data"), {
    code: "ERR_UNEXPECTED",
    statusCode: 503,
    token: "ghp_synthetic_secret",
    url: "https://github.com/private-owner/private-repo",
    date: "2026-09-05",
    cause: new Error("more private content"),
    toJSON: () => {
      throw new Error("Do not serialize arbitrary error objects")
    },
  })
  logger.error("app", "Initialization failed", error)
  expect(RitulayaLogger.log).toHaveBeenLastCalledWith(
    "error",
    "app",
    "Initialization failed",
    JSON.stringify({
      errorType: "TypeError",
      errorCode: "ERR_UNEXPECTED",
      httpStatus: 503,
    }),
  )
})

test("custom names, codes and primitive rejections cannot smuggle free text", () => {
  if (!RitulayaLogger) throw new Error("Missing logger test double")
  logger.warn("app", "Refresh failed", {
    name: "private note",
    code: "ghp_secret",
    statusCode: 36.6,
  })
  expect(RitulayaLogger.log).toHaveBeenLastCalledWith(
    "warn",
    "app",
    "Refresh failed",
    '{"errorType":"UnknownError"}',
  )
  logger.warn("app", "Refresh failed", "private thrown string")
  expect(RitulayaLogger.log).toHaveBeenLastCalledWith(
    "warn",
    "app",
    "Refresh failed",
    '{"errorType":"NonError"}',
  )
})

test("throwing error getters do not escape the diagnostic boundary", () => {
  expect(() =>
    logger.warn("app", "Refresh failed", {
      get name() {
        throw new Error("private")
      },
    }),
  ).not.toThrow()
})
