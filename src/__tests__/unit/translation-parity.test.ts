import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

const LOCALES_DIR = join(__dirname, "../../../locales")

interface Nested {
  [key: string]: string | Nested
}

function flatten(obj: Nested, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const full = prefix ? `${prefix}.${key}` : key
    if (typeof value === "string") return [full]
    return flatten(value, full)
  })
}

function normalizePluralSuffixes(keys: string[]): Set<string> {
  const suffixes = ["_zero", "_one", "_two", "_few", "_many", "_other"]
  return new Set(
    keys.map((key) => {
      const base = suffixes.some((suffix) => key.endsWith(suffix))
        ? key.slice(0, key.lastIndexOf("_"))
        : key
      return base
    }),
  )
}

const localeDirs = readdirSync(LOCALES_DIR).filter((name) =>
  readdirSync(join(LOCALES_DIR, name)).includes("translation.json"),
)

describe("translation parity", () => {
  it("has all six supported locales", () => {
    expect(localeDirs.sort()).toEqual(
      ["en-GB", "en-IN", "en-US", "hi", "ja", "ko"].sort(),
    )
  })

  const reference = normalizePluralSuffixes(
    flatten(
      JSON.parse(readFileSync(join(LOCALES_DIR, "en-US/translation.json"), "utf8")),
    ),
  )

  for (const locale of localeDirs) {
    if (locale === "en-US") continue

    it(`${locale} covers every en-US key`, () => {
      const keys = normalizePluralSuffixes(
        flatten(
          JSON.parse(
            readFileSync(join(LOCALES_DIR, `${locale}/translation.json`), "utf8"),
          ),
        ),
      )
      const missing = [...reference].filter((key) => !keys.has(key))
      const extra = [...keys].filter((key) => !reference.has(key))
      expect({ missing, extra }).toEqual({ missing: [], extra: [] })
    })
  }

  // The widget pipeline replaces {{count}} with a %d placeholder that Kotlin
  // formats at render time; a translation dropping the placeholder would
  // render a literal "%d" on the home-screen widget.
  it("keeps the widget countdown placeholders intact", () => {
    for (const locale of localeDirs) {
      const translation = JSON.parse(
        readFileSync(join(LOCALES_DIR, `${locale}/translation.json`), "utf8"),
      )
      expect(translation.widget.daysUntilMany).toContain("{{count}}")
    }
  })
})
