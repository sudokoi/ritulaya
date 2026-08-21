import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { palette } from "@/constants/palette"

const root = resolve(__dirname, "../../..")

function cssBlock(selector: string): Record<string, string> {
  const css = readFileSync(resolve(root, "src/global.css"), "utf8")
  const block = css.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`))
  const vars: Record<string, string> = {}
  if (!block) return vars
  for (const match of block[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    vars[match[1]] = match[2].toLowerCase()
  }
  return vars
}

function tailwindColors(): Record<string, string> {
  const config = readFileSync(resolve(root, "tailwind.config.js"), "utf8")
  const colors: Record<string, string> = {}
  for (const match of config.matchAll(/["']?([\w-]+)["']?:\s*"(#[0-9a-fA-F]{6})"/g)) {
    colors[match[1]] = match[2].toLowerCase()
  }
  return colors
}

describe("theme token consistency", () => {
  it("global.css :root mirrors palette.light", () => {
    const light = cssBlock(":root")

    expect(light["bg-primary"]).toBe(palette.light.bgPrimary.toLowerCase())
    expect(light["bg-surface"]).toBe(palette.light.bgSurface.toLowerCase())
    expect(light["bg-muted"]).toBe(palette.light.bgMuted.toLowerCase())
    expect(light["text-primary"]).toBe(palette.light.textPrimary.toLowerCase())
    expect(light["text-muted"]).toBe(palette.light.textMuted.toLowerCase())
    expect(light["border"]).toBe(palette.light.border.toLowerCase())
  })

  it("global.css .dark block mirrors palette.dark", () => {
    const dark = cssBlock("\\.dark:root")

    expect(dark["bg-primary"]).toBe(palette.dark.bgPrimary.toLowerCase())
    expect(dark["bg-surface"]).toBe(palette.dark.bgSurface.toLowerCase())
    expect(dark["bg-muted"]).toBe(palette.dark.bgMuted.toLowerCase())
    expect(dark["text-primary"]).toBe(palette.dark.textPrimary.toLowerCase())
    expect(dark["text-muted"]).toBe(palette.dark.textMuted.toLowerCase())
    expect(dark["border"]).toBe(palette.dark.border.toLowerCase())
  })

  it("tailwind accent tokens mirror palette accents", () => {
    const colors = tailwindColors()

    expect(colors["accent"]).toBe(palette.light.accent.toLowerCase())
    expect(colors["accent-dark"]).toBe(palette.dark.accent.toLowerCase())
  })

  it("phase tokens in tailwind.config.js stay unique", () => {
    const colors = tailwindColors()
    const phaseKeys = ["menstrual", "follicular", "ovulation", "luteal"]

    const values = phaseKeys.map((key) => colors[key])
    expect(new Set(values).size).toBe(phaseKeys.length)
  })
})
