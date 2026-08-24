import {
  symptomLabel,
  symptomLabels,
  moodLabel,
  mucusLabel,
  flowLabel,
} from "@/domain/day-entry-display"

describe("day-entry-display", () => {
  const t = (key: string) => {
    const dict: Record<string, string> = {
      "symptoms.cramps": "Cramps",
      "symptoms.tender_breasts": "Tender Breasts",
      "symptoms.hot_flashes": "Hot Flashes",
      "moods.anxious": "Anxious",
      "moods.happy": "Happy",
      "mucus.egg-white": "Egg white",
      "flow.medium": "Medium",
      "flow.heavy": "Heavy",
    }
    return dict[key] ?? key
  }

  it("maps symptom keys via translation", () => {
    expect(symptomLabel("tender_breasts", t)).toBe("Tender Breasts")
    expect(symptomLabel("cramps", t)).toBe("Cramps")
  })

  it("falls back to humanized key when t missing or key absent", () => {
    expect(symptomLabel("tender_breasts")).toBe("tender_breasts")
    // unknown key returns key's tail
    expect(symptomLabel("tender_breasts" as never, () => "symptoms.tender_breasts")).toBe(
      "tender_breasts",
    )
  })

  it("maps symptom array", () => {
    expect(symptomLabels(["cramps", "tender_breasts"], t)).toEqual([
      "Cramps",
      "Tender Breasts",
    ])
  })

  it("maps mood/mucus/flow", () => {
    expect(moodLabel("anxious", t)).toBe("Anxious")
    expect(mucusLabel("egg-white", t)).toBe("Egg white")
    expect(flowLabel("medium", t)).toBe("Medium")
  })
})
