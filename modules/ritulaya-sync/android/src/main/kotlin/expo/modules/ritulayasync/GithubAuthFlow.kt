package expo.modules.ritulayasync

import android.content.Context
import expo.modules.kotlin.AppContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class GithubAuthFlow(private val appContext: AppContext) {

    companion object {
        private const val CLIENT_ID = "Ov23lihYBxLtgot0H8Nq"
        private const val DEVICE_CODE_URL = "https://github.com/login/device/code"
        private const val ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token"
        private const val POLL_INTERVAL_MS = 5000L
        private const val MAX_POLLS = 60
    }

    private var deviceCode: String = ""

    fun initiateDeviceFlow(): Pair<String, String> {
        val json = JSONObject().apply {
            put("client_id", CLIENT_ID)
            put("scope", "repo")
        }

        val response = postJson(DEVICE_CODE_URL, json)
        deviceCode = response.getString("device_code")
        val userCode = response.getString("user_code")
        val verificationUrl = response.getString("verification_uri")

        return Pair(userCode, verificationUrl)
    }

    fun pollForToken(): String? {
        if (deviceCode.isEmpty()) return null

        val json = JSONObject().apply {
            put("client_id", CLIENT_ID)
            put("device_code", deviceCode)
            put("grant_type", "urn:ietf:params:oauth:grant-type:device_code")
        }

        for (i in 0 until MAX_POLLS) {
            runBlocking { delay(POLL_INTERVAL_MS) }

            try {
                val response = postJson(ACCESS_TOKEN_URL, json, "application/json")
                val error = response.optString("error", "")
                if (error == "authorization_pending") continue
                if (error == "slow_down") {
                    runBlocking { delay(POLL_INTERVAL_MS * 2) }
                    continue
                }

                val token = response.optString("access_token", "")
                if (token.isNotEmpty()) return token
            } catch (e: Exception) {
                // Continue polling on transient errors
            }
        }

        return null
    }

    private fun postJson(urlStr: String, json: JSONObject, accept: String = "application/json"): JSONObject {
        val url = URL(urlStr)
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Content-Type", "application/json")
        conn.setRequestProperty("Accept", accept)
        conn.doOutput = true

        OutputStreamWriter(conn.outputStream).use { it.write(json.toString()) }

        val body = conn.inputStream.bufferedReader().use { it.readText() }
        return if (body.isNotEmpty()) JSONObject(body) else JSONObject()
    }
}
