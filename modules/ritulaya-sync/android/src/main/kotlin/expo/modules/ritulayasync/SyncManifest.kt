package expo.modules.ritulayasync

import org.json.JSONObject

object SyncManifest {
    fun write(): String =
        JSONObject()
            .apply {
                put("app", "ritulaya")
                put("appVersion", "0.1.0")
                put("schemaVersion", 1)
                put("sharing", JSONObject.NULL)
            }.toString(2)
}
