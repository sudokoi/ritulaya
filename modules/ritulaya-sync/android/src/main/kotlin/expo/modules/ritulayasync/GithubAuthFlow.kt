package expo.modules.ritulayasync

import android.content.Context
import expo.modules.kotlin.AppContext
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

data class PollResult(
    val token: String?,
    val status: String,
)

class GithubAuthFlow(
    private val appContext: AppContext,
) {
    companion object {
        private const val DEVICE_CODE_URL = "https://github.com/login/device/code"
        private const val ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token"
        private const val MAX_NETWORK_FAILURES = 5
    }

    private var deviceCode: String = ""
    private var consecutiveNetworkFailures: Int = 0

    fun initiateDeviceFlow(clientId: String): Pair<String, String> {
        val json =
            JSONObject().apply {
                put("client_id", clientId)
                put("scope", "repo")
            }

        val response = postJson(DEVICE_CODE_URL, json)
        deviceCode = response.getString("device_code")
        val userCode = response.getString("user_code")
        val verificationUrl = response.getString("verification_uri")

        return Pair(userCode, verificationUrl)
    }

    fun pollOnce(clientId: String): PollResult {
        if (deviceCode.isEmpty()) return PollResult(null, "error")

        val json =
            JSONObject().apply {
                put("client_id", clientId)
                put("device_code", deviceCode)
                put("grant_type", "urn:ietf:params:oauth:grant-type:device_code")
            }

        return try {
            val response = postJson(ACCESS_TOKEN_URL, json, "application/json")
            consecutiveNetworkFailures = 0
            val token = response.optString("access_token", "")
            if (token.isNotEmpty()) {
                PollResult(token, "granted")
            } else {
                when (response.optString("error", "")) {
                    "authorization_pending" -> PollResult(null, "pending")
                    "slow_down" -> PollResult(null, "slow_down")
                    "access_denied", "expired_token" -> PollResult(null, "error")
                    else -> PollResult(null, "pending")
                }
            }
        } catch (e: Exception) {
            // Network failures stay pending so a transient outage doesn't abort
            // the flow, but repeated failures surface as an error instead of
            // silently waiting for the timeout.
            consecutiveNetworkFailures++
            if (consecutiveNetworkFailures >= MAX_NETWORK_FAILURES) {
                PollResult(null, "error")
            } else {
                PollResult(null, "pending")
            }
        }
    }

    private fun postJson(
        urlStr: String,
        json: JSONObject,
        accept: String = "application/json",
    ): JSONObject {
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
