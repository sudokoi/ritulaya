package expo.modules.ritulayadb

import android.content.Context
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.ResultReceiver
import expo.modules.notifications.notifications.model.NotificationContent
import expo.modules.notifications.notifications.model.NotificationRequest
import expo.modules.notifications.notifications.triggers.DailyTrigger
import expo.modules.notifications.notifications.triggers.DateTrigger
import expo.modules.notifications.service.NotificationsService
import kotlinx.coroutines.suspendCancellableCoroutine
import java.util.UUID
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

internal class AndroidReminderActions(
    private val context: Context,
) : ReminderActions {
    override suspend fun clear() {
        awaitResult { NotificationsService.removeAllScheduledNotifications(context, it) }
        awaitResult { NotificationsService.dismissAll(context, it) }
    }

    override suspend fun schedule(input: ReminderInput) {
        require(input.channelId.startsWith("reminders-") && input.title.isNotBlank()) { "Invalid reminder content" }
        val trigger =
            when (input.kind) {
                "daily" -> {
                    DailyTrigger(input.channelId, 20, 0)
                }

                "overdue" -> {
                    DailyTrigger(input.channelId, 9, 0)
                }

                "period" -> {
                    require(input.timestamp.isFinite() && input.timestamp > System.currentTimeMillis()) { "Invalid reminder date" }
                    DateTrigger(input.channelId, input.timestamp.toLong())
                }

                else -> {
                    error("Invalid reminder kind")
                }
            }
        val content =
            NotificationContent
                .Builder()
                .setTitle(input.title)
                .setText(input.body)
                .setAutoDismiss(true)
                .build()
        val request = NotificationRequest(UUID.randomUUID().toString(), content, trigger)
        awaitResult { NotificationsService.schedule(context, request, it) }
    }

    private suspend fun awaitResult(send: (ResultReceiver) -> Unit) =
        suspendCancellableCoroutine { continuation ->
            send(
                object : ResultReceiver(Handler(Looper.getMainLooper())) {
                    override fun onReceiveResult(
                        resultCode: Int,
                        resultData: Bundle?,
                    ) {
                        if (!continuation.isActive) return
                        if (resultCode == NotificationsService.SUCCESS_CODE) {
                            continuation.resume(Unit)
                        } else {
                            continuation.resumeWithException(IllegalStateException("Reminder operation failed"))
                        }
                    }
                },
            )
        }
}
