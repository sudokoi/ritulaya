package expo.modules.ritulayadb

import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext

internal interface ReminderActions {
    suspend fun clear()

    suspend fun schedule(input: ReminderInput)
}

/** Registration and persisted policy changes share one native critical section. */
object ReminderPublication {
    internal val mutex = Mutex()

    fun policyChanged(
        previous: SettingsEntity?,
        next: SettingsEntity,
    ): Boolean =
        previous == null || previous.discreetMode != next.discreetMode || previous.language != next.language ||
            previous.reminderDailyLog != next.reminderDailyLog || previous.reminderPeriodAhead != next.reminderPeriodAhead

    internal suspend fun schedule(
        input: ReminderInput,
        read: suspend () -> SettingsEntity?,
        actions: ReminderActions,
    ): Boolean =
        withContext(NonCancellable) {
            mutex.withLock {
                val policy = read() ?: return@withLock false
                if (policy.discreetMode != if (input.discreet) 1 else 0) return@withLock false
                if (policy.language != input.language) return@withLock false
                val enabled =
                    when (input.kind) {
                        "daily" -> policy.reminderDailyLog == 1
                        "period" -> input.daysAhead > 0 && policy.reminderPeriodAhead == input.daysAhead
                        "overdue" -> policy.reminderPeriodAhead > 0
                        else -> false
                    }
                if (!enabled) return@withLock false
                actions.schedule(input)
                true
            }
        }
}
