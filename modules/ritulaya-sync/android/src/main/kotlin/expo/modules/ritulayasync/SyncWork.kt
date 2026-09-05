package expo.modules.ritulayasync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.CancellationException

class SyncWork(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val prefs = applicationContext.getSharedPreferences("ritulaya_sync", Context.MODE_PRIVATE)
        val orchestrator = SyncOrchestrator(applicationContext, prefs)

        return try {
            orchestrator.sync(propagateFailure = true)
            Result.success()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            if (shouldRetrySync(e, runAttemptCount)) Result.retry() else Result.failure()
        }
    }
}
