import { requireOptionalNativeModule } from "expo"

interface RitulayaCryptoNativeModule {
  initDatabase(path: string): Promise<string>
  rotateKey(): Promise<void>
}

const cryptoModule =
  requireOptionalNativeModule<RitulayaCryptoNativeModule>("RitulayaCrypto")

export async function initEncryptedDatabase(dbPath: string): Promise<string> {
  if (!cryptoModule) {
    return dbPath
  }

  try {
    return await cryptoModule.initDatabase(dbPath)
  } catch {
    return dbPath
  }
}

export function isEncryptionAvailable(): boolean {
  return cryptoModule !== null
}
