import RitulayaCrypto from "../../modules/ritulaya-crypto"

export function getDatabaseKey(): string | null {
  if (!RitulayaCrypto) return null
  return RitulayaCrypto.getDatabaseKey()
}

export async function encryptText(plaintext: string): Promise<string | null> {
  if (!RitulayaCrypto) return null
  try {
    return await RitulayaCrypto.encrypt(plaintext)
  } catch {
    return null
  }
}

export async function decryptText(ciphertext: string): Promise<string | null> {
  if (!RitulayaCrypto) return null
  try {
    return await RitulayaCrypto.decrypt(ciphertext)
  } catch {
    return null
  }
}
