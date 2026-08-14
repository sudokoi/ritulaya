import { requireOptionalNativeModule } from "expo"

interface RitulayaCryptoNativeModule {
  generateKey(): Promise<void>
  encrypt(plaintext: string): Promise<string>
  decrypt(ciphertext: string): Promise<string>
  getDatabaseKey(): string
}

export default requireOptionalNativeModule<RitulayaCryptoNativeModule>("RitulayaCrypto")
