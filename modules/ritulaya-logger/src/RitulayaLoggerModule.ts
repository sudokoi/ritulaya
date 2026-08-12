import { requireOptionalNativeModule } from "expo"

interface RitulayaLoggerNativeModule {
  log(level: string, tag: string, message: string, metadata: string | null): Promise<void>
  exportLogs(): Promise<string>
  clearLogs(): Promise<void>
}

export default requireOptionalNativeModule<RitulayaLoggerNativeModule>("RitulayaLogger")
