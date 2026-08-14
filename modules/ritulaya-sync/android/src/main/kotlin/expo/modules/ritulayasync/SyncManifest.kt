package expo.modules.ritulayasync

import org.json.JSONObject

object SyncManifest {
    fun write(appVersion: String): String =
        JSONObject()
            .apply {
                put("app", "ritulaya")
                put("appVersion", appVersion)
                put("schemaVersion", 1)
                put("sharing", JSONObject.NULL)
            }.toString(2)
}
