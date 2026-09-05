import { format } from "date-fns"
import i18n, { changeLanguage } from "@/i18n"

jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "en-US" }] }))

test("language-change subscribers see the matching date locale on their first render", async () => {
  const observed: string[] = []
  const onChange = () => observed.push(format(new Date(2026, 8, 5), "MMMM"))
  i18n.on("languageChanged", onChange)
  try {
    await changeLanguage("ja")
    await changeLanguage("hi")
    expect(observed).toEqual(["9月", "सितंबर"])
  } finally {
    i18n.off("languageChanged", onChange)
    await changeLanguage("system")
  }
})
