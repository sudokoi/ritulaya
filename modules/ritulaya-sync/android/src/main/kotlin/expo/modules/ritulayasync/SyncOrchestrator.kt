package expo.modules.ritulayasync

import android.content.Context
import android.content.SharedPreferences
import expo.modules.ritulayasync.CsvHandler.CycleRow
import expo.modules.ritulayasync.CsvHandler.DayLogRow

class SyncOrchestrator(
    private val appContext: Context,
    private val prefs: SharedPreferences
) {
    private val tokenStore = SecureTokenStore(appContext)

    fun sync(): Map<String, Any> {
        val token = tokenStore.load("github_token")
        if (token == null) return errorResult("Not authenticated")

        val owner = prefs.getString("repo_owner", null)
        if (owner == null) return errorResult("Repo not configured")
        val repo = prefs.getString("repo_name", null)
        if (repo == null) return errorResult("Repo not configured")
        val branch = prefs.getString("repo_branch", "main")!!

        val api = GithubApiClient(token)

        return try {
            fetchMergePush(api, owner, repo, branch)
        } catch (e: Exception) {
            val failures = prefs.getInt("consecutive_failures", 0) + 1
            prefs.edit().putInt("consecutive_failures", failures).apply()
            if (failures >= 3) {
                prefs.edit().putBoolean("sync_warning", true).apply()
            }
            errorResult(e.message ?: "Sync failed")
        }
    }

    private fun fetchMergePush(
        api: GithubApiClient, owner: String, repo: String, branch: String
    ): Map<String, Any> {
        val cyclesFile = api.getFileContent(owner, repo, "ritulaya-cycles.csv", branch)
        val remoteCycles = if (cyclesFile != null) CsvHandler.parseCycles(cyclesFile.content) else emptyList()

        val logsFile = api.getFileContent(owner, repo, "ritulaya-day-logs.csv", branch)
        val remoteLogs = if (logsFile != null) CsvHandler.parseDayLogs(logsFile.content) else emptyList()

        val manifestFile = api.getFileContent(owner, repo, "ritulaya.json", branch)

        val localCycles = loadLocalCycles()
        val localLogs = loadLocalDayLogs()

        val mergedCycles = MergeEngine.mergeCycles(localCycles, remoteCycles)
        val mergedLogs = MergeEngine.mergeDayLogs(localLogs, remoteLogs)

        val cyclesCsv = CsvHandler.writeCycles(mergedCycles)
        val logsCsv = CsvHandler.writeDayLogs(mergedLogs)
        val manifest = CsvHandler.writeManifest()

        val message = "Sync: ritulaya data update"

        api.updateOrCreateFile(owner, repo, "ritulaya-cycles.csv",
            cyclesCsv, cyclesFile?.sha, branch, message)
        api.updateOrCreateFile(owner, repo, "ritulaya-day-logs.csv",
            logsCsv, logsFile?.sha, branch, message)
        if (manifestFile == null) {
            api.updateOrCreateFile(owner, repo, "ritulaya.json",
                manifest, null, branch, "Sync: add manifest")
        }

        prefs.edit()
            .putLong("last_sync_at", System.currentTimeMillis())
            .putInt("consecutive_failures", 0)
            .putBoolean("sync_warning", false)
            .apply()

        return mapOf(
            "status" to "inSync",
            "syncedAt" to System.currentTimeMillis().toString()
        )
    }

    private fun loadLocalCycles(): List<CycleRow> = emptyList()

    private fun loadLocalDayLogs(): List<DayLogRow> = emptyList()

    private fun errorResult(message: String): Map<String, Any> {
        return mapOf(
            "status" to "error",
            "syncedAt" to (prefs.getLong("last_sync_at", 0L).toString()),
            "warning" to prefs.getBoolean("sync_warning", false),
            "consecutiveFailures" to prefs.getInt("consecutive_failures", 0)
        )
    }
}
