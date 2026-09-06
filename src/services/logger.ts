import RitulayaLogger from "../../modules/ritulaya-logger"
import { diagnosticMetadata } from "./diagnostic-metadata"

type LogLevel = "debug" | "info" | "warn" | "error"

function log(level: LogLevel, tag: string, message: string, metadata?: unknown) {
  if (!RitulayaLogger) return
  try {
    const meta = diagnosticMetadata(metadata)
    // Diagnostics must not create a second, unhandled application failure.
    void RitulayaLogger.log(level, tag, message, meta).catch(() => undefined)
  } catch {
    // Even hostile getters on an error cannot fail the application command.
  }
}

export const logger = {
  debug: (tag: string, message: string, metadata?: unknown) =>
    log("debug", tag, message, metadata),
  info: (tag: string, message: string, metadata?: unknown) =>
    log("info", tag, message, metadata),
  warn: (tag: string, message: string, metadata?: unknown) =>
    log("warn", tag, message, metadata),
  error: (tag: string, message: string, metadata?: unknown) =>
    log("error", tag, message, metadata),
  exportLogs: () => RitulayaLogger?.exportLogs() ?? Promise.resolve(""),
  clearLogs: () => RitulayaLogger?.clearLogs() ?? Promise.resolve(),
}
