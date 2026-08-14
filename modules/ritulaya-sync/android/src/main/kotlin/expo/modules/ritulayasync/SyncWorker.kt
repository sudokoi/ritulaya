package expo.modules.ritulayasync

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

object SyncWorker {
    private const val WORK_NAME = "ritulaya_sync"

    fun schedule(
        context: Context,
        intervalMinutes: Int,
    ) {
        val workManager = WorkManager.getInstance(context)

        if (intervalMinutes <= 0) {
            workManager.cancelUniqueWork(WORK_NAME)
            return
        }

        val constraints =
            Constraints
                .Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .setRequiresBatteryNotLow(true)
                .build()

        val request =
            PeriodicWorkRequestBuilder<SyncWork>(intervalMinutes.toLong(), TimeUnit.MINUTES)
                .setConstraints(constraints)
                .build()

        workManager.enqueueUniquePeriodicWork(
            WORK_NAME,
            ExistingPeriodicWorkPolicy.UPDATE,
            request,
        )
    }

    fun cancel(context: Context) {
        WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
    }
}
