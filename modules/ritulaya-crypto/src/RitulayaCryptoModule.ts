import { requireOptionalNativeModule } from "expo"

interface RitulayaCryptoNativeModule {
  initDatabase(path: string): Promise<string>
}

export default requireOptionalNativeModule<RitulayaCryptoNativeModule>("RitulayaCrypto")
