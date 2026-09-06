package expo.modules.ritulayasync

import android.content.Context
import android.content.SharedPreferences
import expo.modules.ritulayadb.ReminderPublication
import expo.modules.ritulayadb.RitulayaDataStore
import expo.modules.ritulayawidget.RitulayaWidgetProvider
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONObject

class SyncOrchestrator(
    private val appContext: Context,
    private val prefs: SharedPreferences,
) {
    private val tokenStore = SecureTokenStore(appContext)
    private val dataStore = RitulayaDataStore(appContext)

    companion object {
        internal val syncMutex = Mutex()
        private const val STALE_MS = 10 * 60 * 1000L
    }

    suspend fun sync(propagateFailure: Boolean = false): Map<String, Any?> =
        syncMutex.withLock {
            val token = tokenStore.load("github_token") ?: return@withLock statusSnapshot()
            val owner = prefs.getString("repo_owner", null) ?: return@withLock statusSnapshot()
            val repo = prefs.getString("repo_name", null) ?: return@withLock statusSnapshot()
            prefs
                .edit()
                .putString("sync_status", "syncing")
                .putLong("sync_started_at", System.currentTimeMillis())
                .apply()
            try {
                val api = GithubApiClient(token)
                val metadata = api.repository(owner, repo)
                val branch = prefs.getString("repo_branch", null) ?: metadata.getString("default_branch")
                val target = "${metadata.getLong("id")}:$branch"
                prefs
                    .edit()
                    .putString("repo_branch", branch)
                    .putString("sync_target", target)
                    .apply()
                SyncProtocol(repository(target), api.remote(owner, repo, branch)).run()
                val pending = dataStore.readSyncSnapshot().revisions.any { it.pending }
                prefs
                    .edit()
                    .putString("sync_status", if (pending) "idle" else "inSync")
                    .putLong("last_sync_at", System.currentTimeMillis())
                    .putInt(
                        "consecutive_failures",
                        0,
                    ).putBoolean("sync_warning", false)
                    .remove("action_required")
                    .remove("sync_error_code")
                    .apply()
            } catch (error: CancellationException) {
                prefs.edit().putString("sync_status", "idle").apply()
                throw error
            } catch (review: SyncReviewRequired) {
                prefs
                    .edit()
                    .putString("sync_status", "idle")
                    .putString("action_required", review.reason)
                    .remove("sync_error_code")
                    .apply()
            } catch (error: Exception) {
                val failures = prefs.getInt("consecutive_failures", 0) + 1
                prefs
                    .edit()
                    .putString(
                        "sync_status",
                        "error",
                    ).putInt("consecutive_failures", failures)
                    .putBoolean("sync_warning", failures >= 3)
                    .putString(
                        "sync_error_code",
                        when (error) {
                            is SyncPublicationMoved -> "remoteChanged"
                            is GithubHttpException -> "github"
                            else -> "invalidData"
                        },
                    ).apply()
                if (propagateFailure) throw error
            } finally {
                RitulayaWidgetProvider.refresh(appContext)
            }
            statusSnapshot()
        }

    suspend fun review(): Map<String, Any?>? =
        syncMutex.withLock {
            val target = prefs.getString("sync_target", null) ?: return@withLock null
            val review = JSONObject(dataStore.syncCheckpoint(target) ?: "{}").optJSONObject("review") ?: return@withLock null
            if (review.has("resolved")) return@withLock null
            val conflicts = review.optJSONArray("conflicts")
            mapOf(
                "id" to review.getString("id"),
                "kind" to review.getString("kind"),
                "conflicts" to
                    (0 until (conflicts?.length() ?: 0)).map { index ->
                        val conflict = requireNotNull(conflicts).getJSONObject(index)
                        val field = if (conflict.isNull("field")) null else conflict.getString("field")

                        fun preview(side: String): String? {
                            val record = conflict.optJSONObject(side) ?: return null
                            return if (field == null) {
                                record.toString(2)
                            } else if (record.isNull(field)) {
                                null
                            } else {
                                record.getString(field)
                            }
                        }
                        mapOf(
                            "id" to conflict.getString("id"),
                            "record" to conflict.getString("key"),
                            "field" to field,
                            "local" to preview("local"),
                            "remote" to preview("remote"),
                        )
                    },
            )
        }

    suspend fun resolve(
        reviewId: String,
        choices: Map<String, String>,
    ) = syncMutex.withLock {
        val target = requireNotNull(prefs.getString("sync_target", null))
        // Resolution only updates the encrypted journal. Publication still rechecks head and revisions.
        val owner = requireNotNull(prefs.getString("repo_owner", null))
        val repo = requireNotNull(prefs.getString("repo_name", null))
        val branch = requireNotNull(prefs.getString("repo_branch", null))
        val api = GithubApiClient(requireNotNull(tokenStore.load("github_token")))
        SyncProtocol(repository(target), api.remote(owner, repo, branch)).resolve(reviewId, choices)
    }

    private fun repository(target: String) =
        RoomSyncRepository(dataStore, target) { records ->
            val next = records["settings:default"]?.let(SyncRecordsCodec::settingsEntity)
            val previous = dataStore.getSettings()
            if (next != null && ReminderPublication.policyChanged(previous, next)) {
                RitulayaWidgetProvider.hideDetails(appContext, holdForAppRefresh = false)
            }
        }

    fun effectiveStatus(): String {
        val status = prefs.getString("sync_status", "idle") ?: "idle"
        return if (status == "syncing" && System.currentTimeMillis() - prefs.getLong("sync_started_at", 0) >= STALE_MS) "error" else status
    }

    fun statusSnapshot(): Map<String, Any?> =
        mapOf(
            "status" to effectiveStatus(),
            "syncedAt" to prefs.getLong("last_sync_at", 0).takeIf { it > 0 }?.toString(),
            "warning" to prefs.getBoolean("sync_warning", false),
            "consecutiveFailures" to prefs.getInt("consecutive_failures", 0),
            "actionRequired" to prefs.getString("action_required", null),
            "errorCode" to prefs.getString("sync_error_code", null),
        )
}
