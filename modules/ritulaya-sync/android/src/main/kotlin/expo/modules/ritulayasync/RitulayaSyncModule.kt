package expo.modules.ritulayasync

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class RitulayaSyncModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("RitulayaSync")

    AsyncFunction("initiateDeviceFlow") {
      // TODO: Start OAuth device flow, return userCode + verificationUrl
      mapOf(
        "userCode" to "",
        "verificationUrl" to ""
      )
    }

    AsyncFunction("pollForToken") {
      // TODO: Poll GitHub OAuth endpoint, return token or null
      null as String?
    }

    AsyncFunction("disconnect") {
      // TODO: Clear config + token from secure store
    }

    AsyncFunction("configureRepo") { owner: String, repo: String, branch: String ->
      // TODO: Save repo config
    }

    AsyncFunction("getConfig") {
      // TODO: Return current sync config or null
      null as Map<String, String>?
    }

    AsyncFunction("syncNow") {
      // TODO: Run fetch-merge-push cycle
      mapOf(
        "status" to "inSync",
        "syncedAt" to ""
      )
    }

    AsyncFunction("scheduleBackgroundSync") { intervalMinutes: Int ->
      // TODO: Schedule/cancel WorkManager periodic task
    }

    AsyncFunction("getSyncStatus") {
      // TODO: Return sync status
      mapOf(
        "syncedAt" to null,
        "warning" to false,
        "consecutiveFailures" to 0,
        "status" to "idle"
      )
    }

    Events("syncStatusChanged")
    Events("syncConflictDetected")
  }
}
