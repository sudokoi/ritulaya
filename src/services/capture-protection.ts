import RitulayaAuth from "../../modules/ritulaya-auth"
import { nativeRequire } from "@/lib/native"

export function setCaptureProtected(enabled: boolean): Promise<void> {
  return nativeRequire(RitulayaAuth, (auth) => auth.setCaptureProtected(enabled))
}
