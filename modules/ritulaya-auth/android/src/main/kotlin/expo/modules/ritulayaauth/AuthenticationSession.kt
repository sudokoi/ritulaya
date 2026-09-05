package expo.modules.ritulayaauth

import java.util.UUID

/** Owns grant freshness; OS authentication itself remains Android's responsibility. */
internal class AuthenticationSession {
    private var foreground = false
    private var epoch = 0L
    private var nextRequest = 0L
    private var request: Long? = null
    private var credentialRequest = false
    private var grant: Pair<String, Long>? = null

    @Synchronized
    fun enterForeground() {
        foreground = true
    }

    @Synchronized
    fun enterBackground() {
        foreground = false
        epoch += 1
        grant = null
        if (!credentialRequest) request = null
    }

    @Synchronized
    fun begin(): Long? {
        if (!foreground || request != null) return null
        grant = null
        nextRequest += 1
        request = nextRequest
        credentialRequest = false
        return nextRequest
    }

    @Synchronized
    fun awaitCredential(requestId: Long): Boolean {
        if (request != requestId) return false
        credentialRequest = true
        return true
    }

    @Synchronized
    fun complete(requestId: Long): String? {
        if (request != requestId) return null
        request = null
        credentialRequest = false
        val token = UUID.randomUUID().toString()
        grant = token to epoch
        return token
    }

    @Synchronized
    fun isCurrent(token: String): Boolean = foreground && grant == (token to epoch)

    @Synchronized
    fun cancel() {
        request = null
        credentialRequest = false
        grant = null
    }
}
