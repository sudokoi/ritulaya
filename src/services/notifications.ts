import * as Notifications from "expo-notifications"
import { subDays } from "date-fns"
import { Platform } from "react-native"
import { discreetLabel } from "@/lib/discreet"
import i18n from "@/i18n"
import { scheduleReminder } from "@/services/db"

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

/** Android channel names are immutable, so each active locale owns its channel. */
async function ensureReminderChannel(language: string): Promise<string> {
  const channelId = `${REMINDER_CHANNEL_PREFIX}-${language}`
  if (Platform.OS !== "android") return channelId
  await Notifications.setNotificationChannelAsync(channelId, {
    name: i18n.getFixedT(language)("notifications.channelName"),
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

let reminderQueue: Promise<void> = Promise.resolve()
let remindersBlocked = false
let reminderGeneration = 0

/** Invalidate queued work before removing reminders with potentially stale policy. */
export function blockReminders(): Promise<void> {
  remindersBlocked = true
  reminderGeneration += 1
  const work = reminderQueue
    .catch(() => undefined)
    .then(async () => {
      await cancelAllReminders()
      await Notifications.dismissAllNotificationsAsync()
    })
  reminderQueue = work
  return work
}

export function allowReminders() {
  remindersBlocked = false
}

export function updateAllReminders(
  nextPeriodStart: Date | null,
  periodDaysAhead: number,
  dailyLogEnabled: boolean,
  discreet: boolean,
  overdue: boolean,
  languageSetting = "en",
) {
  const generation = reminderGeneration
  const language = i18n.language
  const t = i18n.getFixedT(language)
  const work = reminderQueue
    .catch(() => undefined)
    .then(async () => {
      await cancelAllReminders()
      if (remindersBlocked || generation !== reminderGeneration) return
      const permission = await Notifications.getPermissionsAsync()
      if (
        permission.status !== "granted" ||
        remindersBlocked ||
        generation !== reminderGeneration
      )
        return
      if (!dailyLogEnabled && periodDaysAhead <= 0) return
      const channelId = await ensureReminderChannel(language)
      if (remindersBlocked || generation !== reminderGeneration) return
      const policy = {
        discreet,
        language: languageSetting,
        channelId,
        daysAhead: periodDaysAhead,
        timestamp: 0,
      }
      // Native code checks this captured policy and awaits Android registration
      // under the same lock used to invalidate reminders and install settings.
      if (overdue && periodDaysAhead > 0) {
        await scheduleReminder({
          ...policy,
          kind: "overdue",
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
        })
      } else if (nextPeriodStart && periodDaysAhead > 0) {
        const trigger = subDays(nextPeriodStart, periodDaysAhead)
        trigger.setHours(9, 0, 0, 0)
        if (trigger > new Date())
          await scheduleReminder({
            ...policy,
            kind: "period",
            timestamp: trigger.getTime(),
            title: discreetLabel(
              discreet,
              t("notifications.periodAheadTitle"),
              t("discreet.periodAheadReminderTitle"),
            ),
            body: discreetLabel(
              discreet,
              t("notifications.periodAheadBody", { count: periodDaysAhead }),
              t("discreet.periodAheadReminderBody", {
                count: periodDaysAhead,
                unit: periodDaysAhead === 1 ? t("common.day") : t("common.daysUnit"),
              }),
            ),
          })
      }
      if (dailyLogEnabled)
        await scheduleReminder({
          ...policy,
          kind: "daily",
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
        })
    })
  reminderQueue = work
  return work
}
