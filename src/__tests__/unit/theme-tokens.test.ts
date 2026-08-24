import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { palette } from "@/constants/palette"

const root = resolve(__dirname, "../../..")

function cssBlock(selector: string): Record<string, string> {
  const css = readFileSync(resolve(root, "src/global.css"), "utf8")
  const block = css.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`))
  const vars: Record<string, string> = {}
  if (!block) return vars
  for (const match of block[1].matchAll(
    /--([\w-]+):\s*(#[0-9a-fA-F]{6,8}|rgba\([^)]+\))/g,
  )) {
    vars[match[1]] = match[2].replace(/\s+/g, "").toLowerCase()
  }
  return vars
}

function tailwindColors(): Record<string, string> {
  const config = readFileSync(resolve(root, "tailwind.config.js"), "utf8")
  const colors: Record<string, string> = {}
  for (const match of config.matchAll(
    /["']?([\w-]+)["']?:\s*"(#[0-9a-fA-F]{6,8}|rgba\([^)]+\))"/g,
  )) {
    colors[match[1]] = match[2].replace(/\s+/g, "").toLowerCase()
  }
  return colors
}

function normalize(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase()
}

describe("theme token consistency", () => {
  it("global.css :root mirrors palette.light", () => {
    const light = cssBlock(":root")

    expect(light["bg-primary"]).toBe(normalize(palette.light.bgPrimary))
    expect(light["bg-surface"]).toBe(normalize(palette.light.bgSurface))
    expect(light["bg-muted"]).toBe(normalize(palette.light.bgMuted))
    expect(light["text-primary"]).toBe(normalize(palette.light.textPrimary))
    expect(light["text-muted"]).toBe(normalize(palette.light.textMuted))
    expect(light["border"]).toBe(normalize(palette.light.border))
    expect(light["accent"]).toBe(normalize(palette.light.accent))
    expect(light["on-accent"]).toBe(normalize(palette.light.onAccent))
    expect(light["accent-wash"]).toBe(normalize(palette.light.accentWash))
  })

  it("global.css .dark block mirrors palette.dark", () => {
    const dark = cssBlock("\\.dark:root")

    expect(dark["bg-primary"]).toBe(normalize(palette.dark.bgPrimary))
    expect(dark["bg-surface"]).toBe(normalize(palette.dark.bgSurface))
    expect(dark["bg-muted"]).toBe(normalize(palette.dark.bgMuted))
    expect(dark["text-primary"]).toBe(normalize(palette.dark.textPrimary))
    expect(dark["text-muted"]).toBe(normalize(palette.dark.textMuted))
    expect(dark["border"]).toBe(normalize(palette.dark.border))
    expect(dark["accent"]).toBe(normalize(palette.dark.accent))
    expect(dark["on-accent"]).toBe(normalize(palette.dark.onAccent))
    expect(dark["accent-wash"]).toBe(normalize(palette.dark.accentWash))
  })

  it("tailwind accent tokens mirror palette accents", () => {
    const colors = tailwindColors()

    expect(colors["accent"]).toBe(normalize(palette.light.accent))
    expect(colors["accent-dark"]).toBe(normalize(palette.dark.accent))
    expect(colors["on-accent"]).toBe(normalize(palette.light.onAccent))
    expect(colors["on-accent-dark"]).toBe(normalize(palette.dark.onAccent))
    expect(colors["accent-wash"]).toBe(normalize(palette.light.accentWash))
    expect(colors["accent-wash-dark"]).toBe(normalize(palette.dark.accentWash))
  })

  it("phase tokens in tailwind.config.js stay unique", () => {
    const colors = tailwindColors()
    const phaseKeys = ["menstrual", "follicular", "ovulation", "luteal"]

    const values = phaseKeys.map((key) => colors[key])
    expect(new Set(values).size).toBe(phaseKeys.length)
  })
})
