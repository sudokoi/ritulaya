package expo.modules.ritulayasync

import android.content.Context
import android.content.SharedPreferences
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class RitulayaSyncModule : Module() {

    private lateinit var prefs: SharedPreferences
    private lateinit var orchestrator: SyncOrchestrator
    private lateinit var authFlow: GithubAuthFlow
    private lateinit var tokenStore: SecureTokenStore

    override fun definition() = ModuleDefinition {
        Name("RitulayaSync")

        OnCreate {
            val ctx = appContext.reactContext?.applicationContext
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
                "verificationUrl" to flow.second
            )
        }

        AsyncFunction("pollForToken") { clientId: String ->
            val token = authFlow.pollForToken(clientId)
            if (token != null) {
                tokenStore.save("github_token", token)
            }
            token
        }

        AsyncFunction("disconnect") {
            prefs.edit().clear().apply()
            tokenStore.remove("github_token")
        }

        AsyncFunction("configureRepo") { owner: String, repo: String, branch: String ->
            prefs.edit()
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
            orchestrator.sync()
        }

        AsyncFunction("scheduleBackgroundSync") { intervalMinutes: Int ->
            SyncWorker.schedule(appContext.reactContext?.applicationContext!!, intervalMinutes)
        }

        AsyncFunction("getSyncStatus") {
            val syncedAt = prefs.getLong("last_sync_at", 0L)
            val warning = prefs.getBoolean("sync_warning", false)
            val failures = prefs.getInt("consecutive_failures", 0)

            mapOf(
                "syncedAt" to if (syncedAt > 0) syncedAt.toString() else null,
                "warning" to warning,
                "consecutiveFailures" to failures,
                "status" to if (warning) "error" else "idle"
            )
        }

        Events("syncStatusChanged")
        Events("syncConflictDetected")
    }
}
