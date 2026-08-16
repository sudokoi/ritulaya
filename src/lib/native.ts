import RitulayaDb from "../../modules/ritulaya-db"
import RitulayaPredictions from "../../modules/ritulaya-predictions"
import RitulayaSync from "../../modules/ritulaya-sync"

type DbModule = NonNullable<typeof RitulayaDb>
type PredictionsModule = NonNullable<typeof RitulayaPredictions>
type SyncModule = NonNullable<typeof RitulayaSync>

export const native = {
  db: RitulayaDb as DbModule | null,
  predictions: RitulayaPredictions as PredictionsModule | null,
  sync: RitulayaSync as SyncModule | null,
}

export async function nativeCall<T, M>(
  module: M | null,
  fn: (m: M) => Promise<T>,
  fallback: T,
): Promise<T> {
  return module ? fn(module) : fallback
}

export async function nativeRequire<T, M>(
  module: M | null,
  fn: (m: M) => Promise<T>,
): Promise<T> {
  if (!module) throw new Error("Native module is not available on this device")
  return fn(module)
}
