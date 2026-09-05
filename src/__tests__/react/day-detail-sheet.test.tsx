import { act, fireEvent, render, screen } from "@testing-library/react-native"
import { DayDetailSheet } from "@/components/day-detail-sheet"

jest.mock("lucide-react-native", () => ({ Check: () => null }))
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 0 }),
}))
jest.mock("@/hooks/use-theme-colors", () => ({ useThemeColors: () => ({}) }))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { label?: string }) =>
      options?.label ? `${key} ${options.label}` : key,
  }),
}))

test("a failed save retains the draft, then a successful retry closes once", async () => {
  const onClose = jest.fn()
  const onSave = jest
    .fn()
    .mockRejectedValueOnce(new Error("disk full"))
    .mockResolvedValueOnce(undefined)
  await render(
    <DayDetailSheet
      visible
      date={new Date(2026, 8, 5)}
      onClose={onClose}
      onSave={onSave}
    />,
  )
  await fireEvent.changeText(
    screen.getByPlaceholderText("sheet.notesPlaceholder"),
    "keep my draft",
  )
  await fireEvent.press(screen.getByLabelText("sheet.saveEntry"))
  expect(onClose).not.toHaveBeenCalled()
  expect(screen.getByDisplayValue("keep my draft")).toBeTruthy()
  expect(screen.getByRole("alert")).toHaveTextContent(/calendar.saveFailedTitle/)
  expect(screen.getByRole("alert")).toHaveTextContent(/calendar.saveFailedBody/)
  await fireEvent.press(screen.getByLabelText("sheet.saveEntry"))
  expect(onSave).toHaveBeenLastCalledWith(
    expect.objectContaining({ notes: "keep my draft" }),
  )
  expect(onClose).toHaveBeenCalledTimes(1)
})

test("pending save blocks duplicate submission and dismissal", async () => {
  let finish!: () => void
  const onSave = jest.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  const onClose = jest.fn()
  await render(
    <DayDetailSheet visible date={new Date()} onClose={onClose} onSave={onSave} />,
  )
  await fireEvent.press(screen.getByLabelText("sheet.saveEntry"))
  await fireEvent.press(screen.getByLabelText("sheet.saveEntry"))
  await fireEvent.press(screen.getByLabelText("common.close"))
  expect(onSave).toHaveBeenCalledTimes(1)
  expect(onClose).not.toHaveBeenCalled()
  await act(async () => finish())
  expect(onClose).toHaveBeenCalledTimes(1)
})

test("collapsing additional tracking keeps edited measurements in the save command", async () => {
  const onSave = jest.fn().mockResolvedValue(undefined)
  await render(
    <DayDetailSheet
      visible
      date={new Date(2026, 8, 5)}
      existing={{
        flowIntensity: "medium",
        mood: "calm",
        symptoms: ["cramps"],
        notes: "existing",
        cervicalMucus: "creamy",
        bbt: 36.5,
        sexualActivity: 1,
      }}
      onSave={onSave}
      onClose={jest.fn()}
    />,
  )
  expect(screen.getByDisplayValue("36.5")).toBeTruthy()
  await fireEvent.changeText(screen.getByLabelText("sheet.bbtA11y"), "36.6")
  await fireEvent.press(screen.getByRole("button", { name: "sheet.lessTracking" }))
  expect(screen.queryByLabelText("sheet.bbtA11y")).toBeNull()
  await fireEvent.changeText(screen.getByLabelText("sheet.notes"), "updated notes")
  await fireEvent.press(screen.getByLabelText("sheet.saveEntry"))
  expect(onSave).toHaveBeenCalledWith(
    expect.objectContaining({
      bbt: 36.6,
      cervicalMucus: "creamy",
      sexualActivity: true,
      notes: "updated notes",
      symptoms: ["cramps"],
    }),
  )
})

test("choice controls retain single deselection and multiple symptom selection", async () => {
  const onSave = jest.fn().mockResolvedValue(undefined)
  await render(
    <DayDetailSheet visible date={new Date()} onSave={onSave} onClose={jest.fn()} />,
  )
  const calm = screen.getByRole("button", { name: "sheet.moodState moods.calm" })
  await fireEvent.press(calm)
  await fireEvent.press(calm)
  await fireEvent.press(screen.getByRole("button", { name: "symptoms.cramps" }))
  await fireEvent.press(screen.getByRole("button", { name: "symptoms.bloating" }))
  await fireEvent.press(screen.getByLabelText("sheet.saveEntry"))
  expect(onSave).toHaveBeenCalledWith(
    expect.objectContaining({
      mood: null,
      symptoms: ["cramps", "bloating"],
      bbt: null,
      sexualActivity: null,
    }),
  )
})

test("sexual activity choices do not turn an explicit No into an unknown value", async () => {
  const onSave = jest.fn().mockResolvedValue(undefined)
  await render(
    <DayDetailSheet visible date={new Date()} onSave={onSave} onClose={jest.fn()} />,
  )
  expect(screen.queryByLabelText("sheet.bbtA11y")).toBeNull()
  await fireEvent.press(screen.getByRole("button", { name: "sheet.moreTracking" }))
  const no = screen.getByRole("button", { name: "sheet.sexualActivity: common.no" })
  await fireEvent.press(no)
  await fireEvent.press(no)
  expect(
    screen.getByRole("button", {
      name: "sheet.sexualActivity: common.no",
      selected: true,
    }),
  ).toBeTruthy()
  await fireEvent.press(screen.getByLabelText("sheet.saveEntry"))
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ sexualActivity: false }))
})

test("failed deletion retains the entry and offers an inline error without claiming it is saving", async () => {
  let fail!: (error: Error) => void
  const onDelete = jest.fn(
    () =>
      new Promise<void>((_resolve, reject) => {
        fail = reject
      }),
  )
  const onClose = jest.fn()
  await render(
    <DayDetailSheet
      visible
      date={new Date()}
      onSave={jest.fn()}
      onDelete={onDelete}
      onClose={onClose}
    />,
  )
  await fireEvent.press(screen.getByLabelText("sheet.deleteEntry"))
  expect(screen.queryByText("common.saving")).toBeNull()
  await fireEvent.press(screen.getByLabelText("common.close"))
  expect(onClose).not.toHaveBeenCalled()
  await act(async () => fail(new Error("disk full")))
  expect(screen.getByRole("alert")).toHaveTextContent(/calendar.deleteFailedBody/)
  expect(onClose).not.toHaveBeenCalled()
})
