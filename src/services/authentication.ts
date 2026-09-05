import RitulayaAuth from "../../modules/ritulaya-auth"
import { nativeRequire } from "@/lib/native"

export function authenticate(title: string, credentialLabel: string) {
  return nativeRequire(RitulayaAuth, (auth) => auth.authenticate(title, credentialLabel))
}

/** Synchronous native check: a queued JS success is not proof of a current grant. */
export function isAuthenticationCurrent(token: string): boolean {
  return RitulayaAuth?.isAuthenticationCurrent(token) ?? false
}

export async function cancelAuthentication(): Promise<void> {
  await RitulayaAuth?.cancel()
}
