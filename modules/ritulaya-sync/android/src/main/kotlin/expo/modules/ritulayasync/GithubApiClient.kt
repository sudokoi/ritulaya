package expo.modules.ritulayasync

import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

class HttpNotFoundException(
    message: String,
) : IOException(message)

internal fun interface GithubTransport {
    fun exchange(
        method: String,
        path: String,
        body: JSONObject?,
    ): String
}

class GithubApiClient private constructor(
    private val token: String,
    private val transport: GithubTransport?,
) {
    constructor(token: String) : this(token, null)
    internal constructor(transport: GithubTransport) : this("", transport)

    data class RepoFile(
        val path: String,
        val content: String,
        val sha: String,
    )

    fun repository(
        owner: String,
        repo: String,
    ): JSONObject {
        require(owner.matches(Regex("[A-Za-z0-9-]+")) && repo.matches(Regex("[A-Za-z0-9_.-]+")) && repo !in setOf(".", "..")) {
            "Invalid repository name"
        }
        val data = JSONObject(request("GET", "/repos/$owner/$repo"))
        require(data.getBoolean("private")) { "Sync requires a private repository" }
        require(data.getJSONObject("permissions").getBoolean("push")) { "Repository is not writable" }
        require(data.getString("default_branch").isNotBlank()) { "Repository needs an initialized default branch" }
        return data
    }

    fun getFileContent(
        owner: String,
        repo: String,
        path: String,
        branch: String,
    ): RepoFile? {
        val response =
            try {
                request("GET", "/repos/$owner/$repo/contents/${path.split('/').joinToString("/") { encode(it) }}?ref=${encode(branch)}")
            } catch (
                _: HttpNotFoundException,
            ) {
                return null
            }
        val json = JSONObject(response)
        require(json.getString("encoding") == "base64") { "Unsupported GitHub file response" }
        val decoded = Base64.decode(json.getString("content"), Base64.DEFAULT).toString(Charsets.UTF_8)
        return RepoFile(path, decoded, json.getString("sha"))
    }

    fun createRepo(
        name: String,
        isPrivate: Boolean,
    ) {
        require(isPrivate) { "Sync repositories must be private" }
        request("POST", "/user/repos", JSONObject().put("name", name).put("private", true).put("auto_init", true))
    }

    fun getUsername(): String = JSONObject(request("GET", "/user")).getString("login")

    fun listRepos(): List<Map<String, Any>> {
        val rows = JSONArray(request("GET", "/user/repos?sort=updated&per_page=100"))
        return (0 until rows.length())
            .map { rows.getJSONObject(it) }
            .filter { it.getBoolean("private") }
            .map { mapOf("name" to it.getString("name"), "private" to true) }
    }

    internal fun remote(
        owner: String,
        repo: String,
        branch: String,
    ): GitSyncRemote =
        object : GitSyncRemote {
            private val root = "/repos/$owner/$repo"
            private val ref = branch.split('/').joinToString("/") { encode(it) }

            override fun head(): String {
                repository(owner, repo)
                return JSONObject(request("GET", "$root/git/ref/heads/$ref")).getJSONObject("object").getString("sha")
            }

            override fun read(commit: String): RemoteSyncView {
                val contents =
                    SyncRecordsCodec.files.associateWith {
                        getFileContent(
                            owner,
                            repo,
                            it,
                            commit,
                        )?.content
                    }
                if (contents.values.any { it != null }) {
                    require(contents.values.all { it != null }) { "Incomplete protocol snapshot" }
                    return RemoteSyncView(SyncRecordsCodec.decode(contents.mapValues { requireNotNull(it.value) }), false)
                }
                return RemoteSyncView(
                    SyncRecordsCodec.legacy(
                        getFileContent(owner, repo, "ritulaya-cycles.csv", commit)?.content,
                        getFileContent(owner, repo, "ritulaya-day-logs.csv", commit)?.content,
                        getFileContent(owner, repo, "ritulaya-settings.json", commit)?.content,
                        getFileContent(owner, repo, "ritulaya.json", commit)?.content,
                    ),
                    true,
                )
            }

            override fun prepare(
                parent: String,
                records: SyncRecords,
                migrateLegacy: Boolean,
            ): String {
                repository(owner, repo)
                val tree = JSONObject(request("GET", "$root/git/commits/$parent")).getJSONObject("tree").getString("sha")
                val entries =
                    JSONArray(
                        SyncRecordsCodec.encode(records).map { (path, content) ->
                            JSONObject()
                                .put("path", path)
                                .put("mode", "100644")
                                .put("type", "blob")
                                .put("content", content)
                        },
                    )
                if (migrateLegacy) {
                    // Inspect only this immutable parent's root. Never delete by prefix or
                    // erase legacy files recreated after migration during ordinary sync.
                    val original = JSONObject(request("GET", "$root/git/trees/$tree"))
                    require(!original.getBoolean("truncated")) { "Incomplete repository tree" }
                    val paths = original.getJSONArray("tree")
                    for (index in 0 until paths.length()) {
                        val file = paths.getJSONObject(index)
                        if (file.getString("path") !in SyncRecordsCodec.legacyFiles) continue
                        require(file.getString("type") == "blob" && file.getString("mode") in setOf("100644", "100755")) {
                            "Legacy sync path is not a regular file"
                        }
                        entries.put(
                            JSONObject()
                                .put("path", file.getString("path"))
                                .put("mode", file.getString("mode"))
                                .put("type", "blob")
                                .put("sha", JSONObject.NULL),
                        )
                    }
                }
                val newTree =
                    JSONObject(
                        request("POST", "$root/git/trees", JSONObject().put("base_tree", tree).put("tree", entries)),
                    ).getString("sha")
                return JSONObject(
                    request(
                        "POST",
                        "$root/git/commits",
                        JSONObject()
                            .put(
                                "message",
                                "Sync: update Ritulaya protocol 2 snapshot",
                            ).put("tree", newTree)
                            .put("parents", JSONArray(listOf(parent))),
                    ),
                ).getString("sha")
            }

            override fun publish(commit: String) {
                // Recheck privacy immediately before the publication step too.
                repository(owner, repo)
                try {
                    request("PATCH", "$root/git/refs/heads/$ref", JSONObject().put("sha", commit).put("force", false))
                } catch (
                    error: GithubHttpException,
                ) {
                    if (error.statusCode == 409 || error.statusCode == 422) throw SyncPublicationMoved()
                    throw error
                }
            }

            override fun contains(
                ancestor: String,
                head: String,
            ): Boolean {
                if (ancestor == head) return true
                val status = JSONObject(request("GET", "$root/compare/$ancestor...$head")).getString("status")
                return status == "ahead" || status == "identical"
            }
        }

    private fun request(
        method: String,
        path: String,
        body: JSONObject? = null,
    ): String {
        transport?.let { return it.exchange(method, path, body) }
        val connection = URL("https://api.github.com$path").openConnection() as HttpURLConnection
        connection.requestMethod = method
        connection.instanceFollowRedirects = false
        connection.connectTimeout = 15_000
        connection.readTimeout = 30_000
        connection.setRequestProperty("Authorization", "Bearer $token")
        connection.setRequestProperty("Accept", "application/vnd.github+json")
        connection.setRequestProperty("X-GitHub-Api-Version", "2022-11-28")
        return try {
            if (body != null) {
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")
                connection.outputStream.bufferedWriter(Charsets.UTF_8).use { it.write(body.toString()) }
            }
            val status = connection.responseCode
            if (status == 404) throw HttpNotFoundException("GitHub resource not found")
            if (status !in 200..299) {
                val limited =
                    status == 403 &&
                        (connection.getHeaderField("X-RateLimit-Remaining") == "0" || connection.getHeaderField("Retry-After") != null)
                throw GithubHttpException(if (limited) 429 else status)
            }
            connection.inputStream.use { stream ->
                val output = ByteArrayOutputStream()
                val buffer = ByteArray(8192)
                while (true) {
                    val count = stream.read(buffer)
                    if (count < 0) break
                    require(output.size() + count <= 8 * 1024 * 1024) { "Sync response exceeds supported size" }
                    output.write(buffer, 0, count)
                }
                output.toString("UTF-8")
            }
        } finally {
            connection.disconnect()
        }
    }

    private fun encode(value: String) = URLEncoder.encode(value, "UTF-8").replace("+", "%20")
}
