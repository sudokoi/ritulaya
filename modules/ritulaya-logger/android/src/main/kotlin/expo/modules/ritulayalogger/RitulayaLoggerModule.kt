package expo.modules.ritulayalogger

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class RitulayaLoggerModule : Module() {

    private val scope = CoroutineScope(Dispatchers.IO)
    private lateinit var db: LogDatabase

    override fun definition() = ModuleDefinition {
        Name("RitulayaLogger")

        OnCreate {
            val context = appContext.reactContext?.applicationContext
                ?: throw IllegalStateException("Application context not available")
            db = LogDatabase.getInstance(context)
        }

        AsyncFunction("log") { level: String, tag: String, message: String, metadata: String? ->
            scope.launch {
                val dao = db.logDao()
                dao.insert(LogEntry(level = level, tag = tag, message = message, metadata = metadata))
                val count = dao.count()
                if (count > LogDatabase.getMaxEntries()) {
                    dao.prune(LogDatabase.getMaxEntries())
                }
            }
        }

        AsyncFunction("exportLogs"): String {
            val dao = db.logDao()
            val entries = dao.getRecent(LogDatabase.getMaxEntries())
            return entries.joinToString("\n") { entry ->
                val sanitized = sanitize(entry.message)
                "[${entry.level.uppercase()}] ${entry.tag}: $sanitized"
            }
        }

        AsyncFunction("clearLogs") {
            val dao = db.logDao()
            dao.clearAll()
        }
    }

    private fun sanitize(text: String): String {
        return text
            .replace(Regex("\\d{4}-\\d{2}-\\d{2}"), "[DATE]")
            .replace(Regex("\"symptoms\"\\s*:\\s*\\[[^\\]]*\\]"), "\"symptoms\":[REDACTED]")
            .replace(Regex("\"notes\"\\s*:\\s*\"[^\"]*\""), "\"notes\":\"[REDACTED]\"")
            .replace(Regex("\"mood\"\\s*:\\s*\"[^\"]*\""), "\"mood\":\"[REDACTED]\"")
    }
}
