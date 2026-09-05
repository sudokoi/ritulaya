import { requireOptionalNativeModule } from "expo"

export type AuthenticationResult =
  | { success: true; token: string }
  | { success: false; error: "unavailable" | "cancelled" | "failed" }

interface RitulayaAuthModule {
  authenticate(title: string, credentialLabel: string): Promise<AuthenticationResult>
  isAuthenticationCurrent(token: string): boolean
  cancel(): Promise<void>
}

export default requireOptionalNativeModule<RitulayaAuthModule>("RitulayaAuth")
