jest.mock("react-native", () => ({ Platform: { OS: "android" } }))
jest.mock("@/i18n", () => ({
  __esModule: true,
  default: { language: "en-US", t: (key: string) => key },
}))
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getNotificationChannelsAsync: jest.fn().mockResolvedValue([]),
  AndroidImportance: { DEFAULT: 3 },
  AndroidNotificationVisibility: { PRIVATE: 0 },
  SchedulableTriggerInputTypes: { DAILY: "daily" },
}))

import * as Notifications from "expo-notifications"
import { updateAllReminders } from "@/services/notifications"

beforeEach(() => jest.clearAllMocks())

test("overdue does not override the user's disabled reminder setting", async () => {
  await updateAllReminders(null, 0, false, false, true)
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled()
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled()
})

test("reconciliation does not prompt or schedule when permission is denied", async () => {
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({
    status: "denied",
  } as Notifications.NotificationPermissionsStatus)
  await updateAllReminders(null, 2, true, false, true)
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled()
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled()
})

test("reconciliation is serialized so the final disabled state wins", async () => {
  let finish!: () => void
  jest.mocked(Notifications.cancelAllScheduledNotificationsAsync).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  const first = updateAllReminders(null, 2, false, false, true)
  const second = updateAllReminders(null, 0, false, false, true)
  await Promise.resolve()
  await Promise.resolve()
  expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1)
  finish()
  await Promise.all([first, second])
  const lastCancel = jest.mocked(Notifications.cancelAllScheduledNotificationsAsync).mock
    .invocationCallOrder[1]
  const schedule = jest.mocked(Notifications.scheduleNotificationAsync).mock
    .invocationCallOrder[0]
  expect(lastCancel).toBeGreaterThan(schedule)
})
