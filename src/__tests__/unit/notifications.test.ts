jest.mock("react-native", () => ({ Platform: { OS: "android" } }))
jest.mock("@/i18n", () => ({
  __esModule: true,
  default: {
    language: "en-US",
    getFixedT: (locale: string) => (key: string) => `${locale}:${key}`,
  },
}))
jest.mock("@/services/db", () => ({
  scheduleReminder: jest.fn().mockResolvedValue(true),
}))
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  dismissAllNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getNotificationChannelsAsync: jest.fn().mockResolvedValue([]),
  AndroidImportance: { DEFAULT: 3 },
  AndroidNotificationVisibility: { PRIVATE: 0 },
}))

import * as Notifications from "expo-notifications"
import { scheduleReminder } from "@/services/db"
import i18n from "@/i18n"
import {
  updateAllReminders,
  blockReminders,
  allowReminders,
} from "@/services/notifications"

beforeEach(() => {
  jest.clearAllMocks()
  allowReminders()
  i18n.language = "en-US"
})

test("privacy invalidation cancels queued work and recovery submits only discreet copy", async () => {
  const stale = updateAllReminders(null, 2, true, false, true)
  await blockReminders()
  await stale
  await updateAllReminders(null, 2, true, false, true)
  expect(scheduleReminder).not.toHaveBeenCalled()
  expect(Notifications.dismissAllNotificationsAsync).toHaveBeenCalled()
  allowReminders()
  await updateAllReminders(null, 0, true, true, false, "en-US")
  expect(scheduleReminder).toHaveBeenCalledWith(
    expect.objectContaining({
      kind: "daily",
      discreet: true,
      language: "en-US",
      title: "en-US:discreet.dailyLogCheckIn",
    }),
  )
})

test("overdue never overrides disabled reminders", async () => {
  await updateAllReminders(null, 0, false, false, true)
  expect(scheduleReminder).not.toHaveBeenCalled()
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled()
})

test("reconciliation does not prompt or schedule when permission is denied", async () => {
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({
    status: "denied",
  } as Notifications.NotificationPermissionsStatus)
  await updateAllReminders(null, 2, true, false, true)
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled()
  expect(scheduleReminder).not.toHaveBeenCalled()
})

test("queued copy retains its captured language policy for native stale-request rejection", async () => {
  const first = updateAllReminders(null, 0, true, false, false, "en-US")
  i18n.language = "ja"
  await first
  expect(scheduleReminder).toHaveBeenCalledWith(
    expect.objectContaining({
      language: "en-US",
      title: "en-US:notifications.dailyLogTitle",
      channelId: "reminders-en-US",
    }),
  )
})

test("reconciliation is serialized so a later disabled state cancels preceding registration", async () => {
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
  finish()
  await Promise.all([first, second])
  expect(
    jest.mocked(Notifications.cancelAllScheduledNotificationsAsync).mock
      .invocationCallOrder[1],
  ).toBeGreaterThan(jest.mocked(scheduleReminder).mock.invocationCallOrder[0])
})
