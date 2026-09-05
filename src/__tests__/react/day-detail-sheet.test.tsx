import { Alert } from "react-native"
import { act, fireEvent, render, screen } from "@testing-library/react-native"
import { DayDetailSheet } from "@/components/day-detail-sheet"

jest.mock("lucide-react-native", () => ({ X: () => null, Trash2: () => null }))
jest.mock("@/hooks/use-theme-colors", () => ({ useThemeColors: () => ({}) }))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

test("a failed save retains the draft, then a successful retry closes once", async () => {
  jest.spyOn(Alert, "alert").mockImplementation(() => undefined)
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
  expect(Alert.alert).toHaveBeenCalledWith(
    "calendar.saveFailedTitle",
    "calendar.saveFailedBody",
  )
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
