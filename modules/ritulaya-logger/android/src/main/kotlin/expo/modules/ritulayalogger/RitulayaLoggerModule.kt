package expo.modules.ritulayalogger

import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.runBlocking

class RitulayaLoggerModule : Module() {
    private lateinit var db: LogDatabase
    private var version: String? = null

    override fun definition() =
        ModuleDefinition {
            Name("RitulayaLogger")

            OnCreate {
                val context =
                    appContext.reactContext?.applicationContext
                        ?: throw IllegalStateException("Application context not available")
                db = LogDatabase.getInstance(context)
                version = context.packageManager.getPackageInfo(context.packageName, 0).versionName
            }

            AsyncFunction("log") Coroutine { level: String, tag: String, message: String, metadata: String? ->
                val dao = db.logDao()
                dao.insert(
                    DiagnosticPolicy.project(
                        LogEntity(
                            timestamp = System.currentTimeMillis(),
                            level = level,
                            tag = tag,
                            message = message,
                            metadata = metadata,
                        ),
                    ),
                )
                val count = dao.count()
                if (count > LogDatabase.getMaxEntries()) {
                    dao.prune(LogDatabase.getMaxEntries())
                }
            }

            AsyncFunction("exportLogs") {
                val dao = db.logDao()
                val entries = runBlocking { dao.getRecent(LogDatabase.getMaxEntries()) }
                DiagnosticPolicy.export(entries, version, android.os.Build.VERSION.SDK_INT)
            }

            AsyncFunction("clearLogs") {
                val dao = db.logDao()
                runBlocking { dao.clearAll() }
            }
        }
}
