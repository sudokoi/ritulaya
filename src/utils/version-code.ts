/**
 * Encodes a semantic version string into an Android versionCode integer.
 * Layout: MAJOR(2 digits) | MINOR(2 digits) | PATCH(2 digits) | SUFFIX(3 digits)
 *
 * Stable releases: suffix = 999 (always higher than any prerelease)
 * Prereleases: suffix = stage * 100 + seq
 *
 * Stage map: dev=0, canary=0, snapshot=0, alpha=1, a=1, beta=2, b=2,
 *            rc=3, pre=4, preview=4, prerelease=5
 *
 * Examples:
 *   1.12.2           → 11,202,999
 *   2.0.0-alpha.1    → 20,000,101
 *   2.0.0-beta.3     → 20,000,203
 *   2.0.0-rc.2       → 20,000,302
 *   2.0.0            → 20,000,999
 *   0.1.0-dev.0      →     100,000
 *   0.1.0-alpha.1    →     100,101
 */
export function computeVersionCode(version: string): number {
  const cleaned = version.startsWith("v") ? version.slice(1) : version

  const [main, build] = cleaned.split("+")
  const [core, ...preReleaseParts] = main.split("-")
  const preRelease = preReleaseParts.join("-")

  const parts = core.split(".")
  const major = parseInt(parts[0] ?? "0", 10)
  const minor = parseInt(parts[1] ?? "0", 10)
  const patch = parseInt(parts[2] ?? "0", 10)

  if (minor > 99 || patch > 99) {
    throw new Error(`MINOR and PATCH must be 0-99, got ${major}.${minor}.${patch}`)
  }

  const suffix = preRelease ? computePrereleaseSuffix(preRelease, build) : 999

  const code = major * 10_000_000 + minor * 100_000 + patch * 1_000 + suffix

  if (code <= 0) {
    throw new Error(`versionCode must be > 0, got ${code} from ${version}`)
  }

  if (code >= 2_100_000_000) {
    throw new Error(`versionCode exceeds Android limit: ${code} from ${version}`)
  }

  return code
}

const STAGE_MAP: Record<string, number> = {
  dev: 0,
  canary: 0,
  snapshot: 0,
  alpha: 1,
  a: 1,
  beta: 2,
  b: 2,
  rc: 3,
  pre: 4,
  preview: 4,
  prerelease: 5,
}

function computePrereleaseSuffix(preRelease: string, buildMeta?: string): number {
  const label = preRelease.split(".")[0] ?? ""
  const stage = Math.max(0, Math.min(8, STAGE_MAP[label.toLowerCase()] ?? 0))

  const seq = extractSequence(preRelease, buildMeta)

  if (seq > 99) {
    throw new Error(`Prerelease sequence must be 0-99, got ${seq}`)
  }

  const suffix = stage * 100 + seq
  return suffix >= 999 ? 998 : suffix
}

function extractSequence(preRelease: string, buildMeta?: string): number {
  const allParts = [...preRelease.split("."), ...(buildMeta?.split(".") ?? [])]

  for (const part of allParts) {
    const num = parseInt(part, 10)
    if (!isNaN(num) && !STAGE_MAP[part.toLowerCase() ?? ""]) {
      return num
    }
  }

  return 0
}

/**
 * Decodes a versionCode back to a semver string (for display).
 */
export function decodeVersionCode(code: number): string {
  const major = Math.floor(code / 10_000_000)
  const minor = Math.floor(code / 100_000) % 100
  const patch = Math.floor(code / 1_000) % 100
  const suffix = code % 1_000

  const base = `${major}.${minor}.${patch}`

  if (suffix === 999) return base

  const stage = Math.floor(suffix / 100)
  const seq = suffix % 100

  const stageLabels: Record<number, string> = {
    0: "dev",
    1: "alpha",
    2: "beta",
    3: "rc",
    4: "preview",
    5: "prerelease",
  }

  const label = stageLabels[stage] ?? `stage${stage}`
  return seq > 0 ? `${base}-${label}.${seq}` : `${base}-${label}`
}
