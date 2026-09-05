import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import postcss from "postcss"
import tailwind from "tailwindcss"
import tokens from "@/constants/theme-tokens.json"
import { palette } from "@/constants/palette"
import { PHASE_COLORS } from "@/constants/phase-colors"
import { navigationColors } from "@/lib/navigation-theme"
import { cn } from "@/lib/utils"

const config = require("../../../tailwind.config.js")

test("semantic typography survives color merging and can be overridden deliberately", () => {
  expect(cn("min-h-touch", "min-h-32")).toBe("min-h-32")
  expect(cn("text-label", "text-[var(--on-accent)]")).toBe(
    "text-label text-[var(--on-accent)]",
  )
  expect(cn("text-body", "text-supporting", "text-[var(--text-muted)]")).toBe(
    "text-supporting text-[var(--text-muted)]",
  )
})

test("the app's Tailwind adapter publishes every semantic token for both themes", async () => {
  const css = readFileSync(resolve(__dirname, "../../global.css"), "utf8")
  const result = await postcss([
    tailwind({ ...config, content: [{ raw: "text-body", extension: "html" }] }),
  ]).process(css, { from: undefined })
  for (const [mode, selector] of [
    ["light", ":root"],
    ["dark", ".dark:root"],
  ] as const) {
    const declarations: Record<string, string> = {}
    result.root.walkRules(selector, (rule) => {
      rule.walkDecls((declaration) => {
        declarations[declaration.prop] = declaration.value
      })
    })
    for (const [name, value] of Object.entries(tokens.color[mode])) {
      const variable = `--${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`
      expect(declarations[variable]).toBe(value)
    }
  }
})

test("native colors and legacy phase aliases use the authored theme", () => {
  expect(palette).toEqual(tokens.color)
  expect(PHASE_COLORS).toEqual(tokens.phase)
  for (const [phase, colors] of Object.entries(tokens.phase)) {
    expect(config.theme.extend.colors[phase]).toBe(colors.hex)
    expect(config.theme.extend.colors[`${phase}-dark`]).toBe(colors.darkHex)
  }
  expect(config.theme.extend.borderRadius.card).toBe(`${tokens.radius.card}px`)
})

test.each([false, true])("navigation maps semantic colors in dark=%s", (dark) => {
  const colors = dark ? palette.dark : palette.light
  expect(navigationColors(dark)).toEqual({
    primary: colors.accent,
    background: colors.bgPrimary,
    card: colors.bgSurface,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.danger,
  })
})
