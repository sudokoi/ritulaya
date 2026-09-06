package expo.modules.ritulayalogger

import org.json.JSONObject

/** Project before storage AND export, including rows written by older app versions. */
internal object DiagnosticPolicy {
    private val events =
        mapOf(
            "app" to setOf("Initialization failed", "Refresh failed", "Sync status refresh failed"),
            "widget" to setOf("Refresh failed"),
            "notifications" to setOf("Reminder scheduling failed"),
            "sync:device-flow" to setOf("GitHub device flow failed"),
            "sync:repo" to setOf("Failed to create repository", "Failed to configure repository"),
            "sync:status" to setOf("Sync failed"),
        )
    private val levels = setOf("debug", "info", "warn", "error")
    private val errorTypes =
        setOf(
            "Error",
            "TypeError",
            "RangeError",
            "ReferenceError",
            "SyntaxError",
            "URIError",
            "EvalError",
            "AggregateError",
            "AbortError",
            "UnknownError",
            "NonError",
        )
    private val errorCodes =
        setOf(
            "ERR_UNEXPECTED",
            "ERR_FUNCTION_CALL",
            "ERR_INVALID_ARGUMENT",
            "ERR_INTERNAL",
            "ERR_MODULE_NOT_FOUND",
            "ERR_NO_PERMISSION",
            "ERR_MISSING_PERMISSIONS",
            "github",
            "invalidData",
            "remoteChanged",
        )
    private val httpStatuses = setOf(400, 401, 403, 404, 408, 409, 422, 429, 500, 502, 503, 504)

    fun project(entry: LogEntity): LogEntity {
        val known = events[entry.tag]?.contains(entry.message) == true
        return entry.copy(
            level = entry.level.takeIf { it in levels } ?: "error",
            tag = if (known) entry.tag else "app",
            message = if (known) entry.message else "Diagnostic details omitted",
            metadata = metadata(entry.metadata),
        )
    }

    private fun metadata(raw: String?): String? {
        if (raw == null || raw.length > 4096) return null
        val input =
            try {
                JSONObject(raw)
            } catch (_: org.json.JSONException) {
                return null
            }
        val safe = JSONObject()
        (input.opt("errorType") as? String)?.takeIf { it in errorTypes }?.let { safe.put("errorType", it) }
        (input.opt("errorCode") as? String)?.takeIf { it in errorCodes }?.let { safe.put("errorCode", it) }
        (input.opt("httpStatus") as? Int)?.takeIf { it in httpStatuses }?.let { safe.put("httpStatus", it) }
        return safe.takeIf { it.length() > 0 }?.toString()
    }

    fun export(
        entries: List<LogEntity>,
        version: String?,
        androidApi: Int,
    ): String {
        if (entries.isEmpty()) return ""
        val safeVersion = version?.takeIf { it.matches(Regex("[0-9]{1,6}(\\.[0-9]{1,6}){1,3}")) } ?: "unknown"
        val header = "Ritulaya diagnostics v1 | app=$safeVersion | androidApi=$androidApi | newest first"
        return header + "\n" +
            entries.joinToString("\n") { original ->
                val entry = project(original)
                "[${entry.level.uppercase()}] ${entry.tag}: ${entry.message}" + (entry.metadata?.let { " $it" } ?: "")
            }
    }
}
