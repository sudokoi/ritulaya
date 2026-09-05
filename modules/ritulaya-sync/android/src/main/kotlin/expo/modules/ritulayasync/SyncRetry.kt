package expo.modules.ritulayasync

import java.io.IOException

class GithubHttpException(
    val statusCode: Int,
) : IOException("GitHub API error $statusCode")

/** No response bodies (which can include user content) enter diagnostics. */
internal fun shouldRetrySync(
    error: Exception,
    attempt: Int,
): Boolean {
    if (attempt >= 3) return false
    return when (error) {
        is GithubHttpException -> error.statusCode in 500..599 || error.statusCode in setOf(408, 409, 429)
        is HttpNotFoundException -> false
        is IOException -> true
        else -> false
    }
}
