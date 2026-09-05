import * as Notifications from "expo-notifications"
import { subDays } from "date-fns"
import { Platform } from "react-native"
import { discreetLabel } from "@/lib/discreet"
import i18n from "@/i18n"

const REMINDER_CHANNEL_PREFIX = "reminders"

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

/**
 * One channel per active language: Android never updates an existing
 * channel's name, so a language switch creates a fresh, correctly named
 * channel and the stale ones are removed.
 */
async function ensureReminderChannel(language: string): Promise<string> {
  const channelId = `${REMINDER_CHANNEL_PREFIX}-${language}`
  if (Platform.OS !== "android") return channelId
  await Notifications.setNotificationChannelAsync(channelId, {
    name: i18n.t("notifications.channelName"),
    importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  })
  const channels = await Notifications.getNotificationChannelsAsync()
  await Promise.all(
    channels
      .filter(
        (channel) =>
          channel.id.startsWith(REMINDER_CHANNEL_PREFIX) && channel.id !== channelId,
      )
      .map((channel) => Notifications.deleteNotificationChannelAsync(channel.id)),
  )
  return channelId
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === "granted") return true

  await ensureReminderChannel(i18n.language)
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

  const channelId = await ensureReminderChannel(i18n.language)
  const t = i18n.t.bind(i18n)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: discreetLabel(
        discreet,
        t("notifications.periodAheadTitle"),
        t("discreet.periodAheadReminderTitle"),
      ),
      body: discreetLabel(
        discreet,
        t("notifications.periodAheadBody", { count: daysAhead }),
        t("discreet.periodAheadReminderBody", {
          count: daysAhead,
          unit: daysAhead === 1 ? t("common.day") : t("common.daysUnit"),
        }),
      ),
      data: { type: "period-reminder" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId,
    },
  })
}

export async function scheduleDailyLogReminder(discreet: boolean) {
  const t = i18n.t.bind(i18n)
  const channelId = await ensureReminderChannel(i18n.language)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: discreetLabel(
        discreet,
        t("notifications.dailyLogTitle"),
        t("discreet.dailyLogCheckIn"),
      ),
      body: discreetLabel(
        discreet,
        t("notifications.dailyLogBody"),
        t("discreet.dailyLogBody"),
      ),
      data: { type: "daily-log-reminder" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
      channelId,
    },
  })
}

export async function scheduleOverdueNudge(discreet: boolean) {
  const t = i18n.t.bind(i18n)
  const channelId = await ensureReminderChannel(i18n.language)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: discreetLabel(
        discreet,
        t("notifications.overdueTitle"),
        t("discreet.overdueReminderTitle"),
      ),
      body: discreetLabel(
        discreet,
        t("notifications.overdueBody"),
        t("discreet.overdueReminderBody"),
      ),
      data: { type: "overdue-nudge" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
      channelId,
    },
  })
}

let reminderQueue: Promise<void> = Promise.resolve()

export function updateAllReminders(
  nextPeriodStart: Date | null,
  periodDaysAhead: number,
  dailyLogEnabled: boolean,
  discreet: boolean,
  overdue: boolean,
) {
  const work = reminderQueue
    .catch(() => undefined)
    .then(async () => {
      await cancelAllReminders()
      const permission = await Notifications.getPermissionsAsync()
      if (permission.status !== "granted") return

      if (overdue && periodDaysAhead > 0) {
        // While overdue, the daily nudge replaces the period-ahead reminder.
        await scheduleOverdueNudge(discreet)
      } else if (nextPeriodStart && periodDaysAhead > 0) {
        await schedulePeriodReminder(nextPeriodStart, periodDaysAhead, discreet)
      }

      if (dailyLogEnabled) {
        await scheduleDailyLogReminder(discreet)
      }
    })
  reminderQueue = work
  return work
}
