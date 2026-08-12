/**
 * Inlined version of computeVersionCode for use at build time.
 * app.config.js runs in a plain Node.js context (not bundled by Metro),
 * so it cannot import from TypeScript source files.
 */
function computeVersionCode(version) {
  const cleaned = version.startsWith("v") ? version.slice(1) : version

  const [main] = cleaned.split("+")
  const [core, ...preReleaseParts] = main.split("-")
  const preRelease = preReleaseParts.join("-")

  const parts = core.split(".")
  const major = parseInt(parts[0] ?? "0", 10)
  const minor = parseInt(parts[1] ?? "0", 10)
  const patch = parseInt(parts[2] ?? "0", 10)

  const suffix = preRelease ? computePrereleaseSuffix(preRelease) : 999

  return major * 10_000_000 + minor * 100_000 + patch * 1_000 + suffix
}

const STAGE_MAP = {
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

function computePrereleaseSuffix(preRelease) {
  const label = preRelease.split(".")[0] ?? ""
  const stage = Math.max(0, Math.min(8, STAGE_MAP[label.toLowerCase()] ?? 0))
  const allParts = preRelease.split(".")
  let seq = 0
  for (const part of allParts) {
    const num = parseInt(part, 10)
    if (!isNaN(num) && !STAGE_MAP[part.toLowerCase() ?? ""]) {
      seq = num
      break
    }
  }
  const suffix = stage * 100 + seq
  return suffix >= 999 ? 998 : suffix
}

const { version } = require("./package.json")
const versionCode = computeVersionCode(version)

module.exports = {
  expo: {
    name: "Ritulaya",
    slug: "ritulaya",
    version,
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "ritulaya",
    userInterfaceStyle: "automatic",
    platforms: ["android"],
    android: {
      package: "com.sudokoi.ritulaya",
      versionCode,
      adaptiveIcon: {
        backgroundColor: "#1A1A1C",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
    },
    plugins: [
      "expo-router",
      "./plugins/withRitulayaWidget",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#1A1A1C",
          image: "./assets/images/splash-icon.png",
          imageWidth: 76,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  },
}
