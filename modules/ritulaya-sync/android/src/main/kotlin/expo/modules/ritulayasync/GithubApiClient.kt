package expo.modules.ritulayasync

import android.util.Base64
import java.io.BufferedReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets

class GithubApiClient(
    private val token: String,
) {
    data class RepoFile(
        val path: String,
        val content: String,
        val sha: String,
    )

    private fun authHeader(): String = "Bearer $token"

    fun getFileContent(
        owner: String,
        repo: String,
        path: String,
        branch: String,
    ): RepoFile? {
        val url = "https://api.github.com/repos/$owner/$repo/contents/$path?ref=$branch"
        val response = get(url)
        val json = org.json.JSONObject(response)
        val content = json.optString("content", "")
        val sha = json.optString("sha", "")
        if (content.isEmpty()) return null
        val decoded = String(Base64.decode(content, Base64.DEFAULT), StandardCharsets.UTF_8)
        return RepoFile(path, decoded, sha)
    }

    fun updateOrCreateFile(
        owner: String,
        repo: String,
        path: String,
        content: String,
        sha: String?,
        branch: String,
        message: String,
    ) {
        val url = "https://api.github.com/repos/$owner/$repo/contents/$path"
        val body =
            org.json.JSONObject().apply {
                put("message", message)
                put("content", Base64.encodeToString(content.toByteArray(), Base64.DEFAULT))
                put("branch", branch)
                if (sha != null) put("sha", sha)
            }
        put(url, body.toString())
    }

    fun getRepoDefaultBranch(
        owner: String,
        repo: String,
    ): String {
        val url = "https://api.github.com/repos/$owner/$repo"
        val response = get(url)
        val json = org.json.JSONObject(response)
        return json.optString("default_branch", "main")
    }

    fun createRepo(
        name: String,
        isPrivate: Boolean,
    ) {
        val url = "https://api.github.com/user/repos"
        val body =
            org.json.JSONObject().apply {
                put("name", name)
                put("private", isPrivate)
                put("auto_init", true)
            }
        post(url, body.toString())
    }

    fun getUsername(): String {
        val url = "https://api.github.com/user"
        val response = get(url)
        val json = org.json.JSONObject(response)
        return json.optString("login", "")
    }

    fun listRepos(): List<Map<String, Any>> {
        val url = "https://api.github.com/user/repos?sort=updated&per_page=100"
        val response = get(url)
        val arr = org.json.JSONArray(response)
        val repos = mutableListOf<Map<String, Any>>()
        for (i in 0 until arr.length()) {
            val repo = arr.getJSONObject(i)
            repos.add(
                mapOf(
                    "name" to repo.optString("name"),
                    "private" to repo.optBoolean("private"),
                ),
            )
        }
        return repos
    }

    private fun get(urlStr: String): String {
        val conn =
            (URL(urlStr).openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                setRequestProperty("Authorization", authHeader())
                setRequestProperty("Accept", "application/vnd.github+json")
                setRequestProperty("X-GitHub-Api-Version", "2022-11-28")
            }
        return readResponse(conn)
    }

    private fun put(
        urlStr: String,
        body: String,
    ) {
        val conn =
            (URL(urlStr).openConnection() as HttpURLConnection).apply {
                requestMethod = "PUT"
                setRequestProperty("Authorization", authHeader())
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Accept", "application/vnd.github+json")
                doOutput = true
            }
        OutputStreamWriter(conn.outputStream).use { it.write(body) }
        readResponse(conn)
    }

    private fun post(
        urlStr: String,
        body: String,
    ) {
        val conn =
            (URL(urlStr).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("Authorization", authHeader())
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Accept", "application/vnd.github+json")
                doOutput = true
            }
        OutputStreamWriter(conn.outputStream).use { it.write(body) }
        readResponse(conn)
    }

    private fun readResponse(conn: HttpURLConnection): String {
        val code = conn.responseCode
        val stream = if (code in 200..299) conn.inputStream else conn.errorStream
        return stream?.bufferedReader()?.use(BufferedReader::readText) ?: throw Exception("HTTP $code")
    }
}
