package expo.modules.ritulayasync

import android.content.Context
import android.content.SharedPreferences
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.runBlocking

class RitulayaSyncModule : Module() {
    private lateinit var prefs: SharedPreferences
    private lateinit var orchestrator: SyncOrchestrator
    private lateinit var authFlow: GithubAuthFlow
    private lateinit var tokenStore: SecureTokenStore

    override fun definition() =
        ModuleDefinition {
            Name("RitulayaSync")

            OnCreate {
                val ctx =
                    appContext.reactContext?.applicationContext
                        ?: throw IllegalStateException("Context not available")
                prefs = ctx.getSharedPreferences("ritulaya_sync", Context.MODE_PRIVATE)
                tokenStore = SecureTokenStore(ctx)
                orchestrator = SyncOrchestrator(ctx, prefs)
                authFlow = GithubAuthFlow(appContext)
            }

            AsyncFunction("initiateDeviceFlow") { clientId: String ->
                val flow = authFlow.initiateDeviceFlow(clientId)
                mapOf(
                    "userCode" to flow.first,
                    "verificationUrl" to flow.second,
                )
            }

            AsyncFunction("pollOnce") { clientId: String ->
                val result = authFlow.pollOnce(clientId)
                if (result.token != null) {
                    tokenStore.save("github_token", result.token)
                }
                // The token is persisted natively and never crosses the bridge.
                mapOf(
                    "status" to result.status,
                )
            }

            AsyncFunction("disconnect") {
                prefs.edit().clear().apply()
                tokenStore.remove("github_token")
                SyncWorker.cancel(appContext.reactContext?.applicationContext!!)
            }

            AsyncFunction("getUsername") {
                val token = tokenStore.load("github_token") ?: return@AsyncFunction null
                GithubApiClient(token).getUsername()
            }

            AsyncFunction("listRepos") {
                val token = tokenStore.load("github_token") ?: return@AsyncFunction null
                GithubApiClient(token).listRepos()
            }

            AsyncFunction("createRepo") { name: String ->
                val token = tokenStore.load("github_token") ?: return@AsyncFunction null
                GithubApiClient(token).createRepo(name, true)
            }

            AsyncFunction("configureRepo") { owner: String, repo: String, branch: String ->
                prefs
                    .edit()
                    .putString("repo_owner", owner)
                    .putString("repo_name", repo)
                    .putString("repo_branch", branch)
                    .apply()
            }

            AsyncFunction("getConfig") {
                val owner = prefs.getString("repo_owner", null) ?: return@AsyncFunction null
                val repo = prefs.getString("repo_name", null) ?: return@AsyncFunction null
                val branch = prefs.getString("repo_branch", "main")!!
                mapOf("repoOwner" to owner, "repoName" to repo, "branch" to branch)
            }

            AsyncFunction("syncNow") {
                val result = runBlocking { orchestrator.sync() }
                // Emit the full status shape so listeners can consume it
                // directly, identical to getSyncStatus.
                sendEvent("syncStatusChanged", statusSnapshot())
                result
            }

            AsyncFunction("scheduleBackgroundSync") { intervalMinutes: Int ->
                SyncWorker.schedule(appContext.reactContext?.applicationContext!!, intervalMinutes)
            }

            AsyncFunction("getSyncStatus") {
                statusSnapshot()
            }

            Events("syncStatusChanged")
            Events("syncConflictDetected")
        }

    private fun statusSnapshot(): Map<String, Any?> {
        val syncedAt = prefs.getLong("last_sync_at", 0L)
        return mapOf(
            "syncedAt" to if (syncedAt > 0) syncedAt.toString() else null,
            "warning" to prefs.getBoolean("sync_warning", false),
            "consecutiveFailures" to prefs.getInt("consecutive_failures", 0),
            "status" to (prefs.getString("sync_status", "idle") ?: "idle"),
        )
    }
}
