import * as Notifications from "expo-notifications"
import { subDays } from "date-fns"
import { Platform } from "react-native"
import { discreetLabel } from "@/lib/discreet"

const REMINDER_CHANNEL_ID = "reminders"

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

async function ensureReminderChannel() {
  if (Platform.OS !== "android") return
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: "Reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  })
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === "granted") return true

  const { status } = await Notifications.requestPermissionsAsync()
  return status === "granted"
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync()
}

export async function schedulePeriodReminder(
  nextPeriodStart: Date,
  daysAhead: number,
  discreet: boolean,
) {
  const triggerDate = subDays(nextPeriodStart, daysAhead)
  triggerDate.setHours(9, 0, 0, 0)

  if (triggerDate <= new Date()) return

  await ensureReminderChannel()
  await Notifications.scheduleNotificationAsync({
    content: {
      title: discreetLabel(discreet, "Period Ahead", "Reminder"),
      body: discreetLabel(
        discreet,
        `Your period may start in ${daysAhead} ${daysAhead === 1 ? "day" : "days"}.`,
        `An entry is due in ${daysAhead} ${daysAhead === 1 ? "day" : "days"}.`,
      ),
      data: { type: "period-reminder" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: REMINDER_CHANNEL_ID,
    },
  })
}

export async function scheduleDailyLogReminder(discreet: boolean) {
  await ensureReminderChannel()
  await Notifications.scheduleNotificationAsync({
    content: {
      title: discreetLabel(discreet, "Daily Log", "Check-in"),
      body: discreetLabel(
        discreet,
        "How are you feeling today? Log your symptoms.",
        "Time for your daily entry.",
      ),
      data: { type: "daily-log-reminder" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
      channelId: REMINDER_CHANNEL_ID,
    },
  })
}

export async function updateAllReminders(
  nextPeriodStart: Date | null,
  periodDaysAhead: number,
  dailyLogEnabled: boolean,
  discreet: boolean,
) {
  await cancelAllReminders()

  if (nextPeriodStart && periodDaysAhead > 0) {
    await schedulePeriodReminder(nextPeriodStart, periodDaysAhead, discreet)
  }

  if (dailyLogEnabled) {
    await scheduleDailyLogReminder(discreet)
  }
}
