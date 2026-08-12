package expo.modules.ritulayasync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

class SyncWork(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val prefs = applicationContext.getSharedPreferences("ritulaya_sync", Context.MODE_PRIVATE)
        val orchestrator = SyncOrchestrator(applicationContext, prefs)

        return try {
            orchestrator.sync()
            Result.success()
        } catch (e: Exception) {
            if (runAttemptCount < 3) Result.retry() else Result.failure()
        }
    }
}
