package expo.modules.ritulayasync

import com.google.common.truth.Truth.assertThat
import org.json.JSONObject
import org.junit.Test

class GithubPublicationTest {
    @Test
    fun `migration creates flat files and deletes only exact existing legacy files in the same tree`() {
        val requests = mutableListOf<Triple<String, String, JSONObject?>>()
        val existing =
            SyncRecordsCodec.legacyFiles + setOf("README.md", "ritulaya-cycles.csv.backup", "ritulaya", "ritulaya-sync-manifest.json")
        val api =
            migrationApi(
                requests,
                JSONObject().put("truncated", false).put(
                    "tree",
                    org.json.JSONArray(
                        existing.map { path ->
                            JSONObject().put("path", path).put("type", "blob").put("mode", "100644")
                        },
                    ),
                ),
            )
        api.remote("owner", "repo", "main").prepare("parent", emptyMap(), migrateLegacy = true)
        assertThat(requests.none { it.first == "PATCH" || it.first == "DELETE" }).isTrue()
        val body = requireNotNull(requests.single { it.first == "POST" && it.second.endsWith("/trees") }.third)
        assertThat(body.getString("base_tree")).isEqualTo("root-tree")
        val tree = body.getJSONArray("tree")
        val entries = (0 until tree.length()).map { tree.getJSONObject(it) }
        assertThat(entries.filter { it.has("sha") }.map { it.getString("path") }).containsExactlyElementsIn(SyncRecordsCodec.legacyFiles)
        assertThat(entries.filter { it.has("sha") }.all { it.isNull("sha") && !it.has("content") }).isTrue()
        assertThat(entries.filter { it.has("content") }.map { it.getString("path") }).containsExactlyElementsIn(SyncRecordsCodec.files)
        val commit = requireNotNull(requests.last().third)
        assertThat(commit.getJSONArray("parents").getString(0)).isEqualTo("parent")
        assertThat(commit.getString("tree")).isEqualTo("candidate-tree")
    }

    @Test
    fun `fresh repository initialization has no nonexistent file deletions`() {
        val requests = mutableListOf<Triple<String, String, JSONObject?>>()
        val api = migrationApi(requests, JSONObject("""{"truncated":false,"tree":[{"path":"README.md","type":"blob","mode":"100644"}]}"""))
        api.remote("owner", "repo", "main").prepare("parent", emptyMap(), migrateLegacy = true)
        val entries = requireNotNull(requests.single { it.second.endsWith("/trees") && it.first == "POST" }.third).getJSONArray("tree")
        assertThat(entries.length()).isEqualTo(4)
        assertThat((0 until entries.length()).all { entries.getJSONObject(it).has("content") }).isTrue()
    }

    @Test
    fun `incomplete tree listing refuses migration before any upload`() {
        val requests = mutableListOf<Triple<String, String, JSONObject?>>()
        val api = migrationApi(requests, JSONObject("""{"truncated":true,"tree":[]}"""))
        try {
            api.remote("owner", "repo", "main").prepare("parent", emptyMap(), migrateLegacy = true)
            error("Expected incomplete tree rejection")
        } catch (_: IllegalArgumentException) {
        }
        assertThat(requests.all { it.first == "GET" }).isTrue()
    }

    private fun migrationApi(
        requests: MutableList<Triple<String, String, JSONObject?>>,
        rootTree: JSONObject,
    ) = GithubApiClient(
        GithubTransport { method, path, body ->
            requests += Triple(method, path, body)
            when (path) {
                "/repos/owner/repo" -> """{"private":true,"permissions":{"push":true},"default_branch":"main"}"""
                "/repos/owner/repo/git/commits/parent" -> """{"tree":{"sha":"root-tree"}}"""
                "/repos/owner/repo/git/trees/root-tree" -> rootTree.toString()
                "/repos/owner/repo/git/trees" -> """{"sha":"candidate-tree"}"""
                "/repos/owner/repo/git/commits" -> """{"sha":"candidate"}"""
                else -> error("Unexpected request: $method $path")
            }
        },
    )

    @Test(expected = IllegalArgumentException::class)
    fun `public repositories fail before uploading any record data`() {
        val api =
            GithubApiClient(
                GithubTransport { method, path, _ ->
                    assertThat(method).isEqualTo("GET")
                    assertThat(path).isEqualTo("/repos/owner/repo")
                    """{"private":false,"permissions":{"push":true},"default_branch":"main"}"""
                },
            )
        api.remote("owner", "repo", "main").prepare("parent", emptyMap())
    }

    @Test(expected = SyncPublicationMoved::class)
    fun `non fast forward rejection requests a fresh merge`() {
        val api =
            GithubApiClient(
                GithubTransport { method, _, _ ->
                    if (method == "PATCH") throw GithubHttpException(422)
                    """{"private":true,"permissions":{"push":true},"default_branch":"main"}"""
                },
            )
        api.remote("owner", "repo", "main").publish("candidate")
    }

    @Test
    fun `legacy reads use the same immutable commit even for absent files`() {
        val paths = mutableListOf<String>()
        val api =
            GithubApiClient(
                GithubTransport { method, path, _ ->
                    assertThat(method).isEqualTo("GET")
                    paths += path
                    throw HttpNotFoundException("absent fixture")
                },
            )
        assertThat(api.remote("owner", "repo", "main").read("fixed-commit").migration).isTrue()
        assertThat(paths).hasSize(8)
        assertThat(paths.all { it.endsWith("?ref=fixed-commit") }).isTrue()
    }

    @Test
    fun `publication preserves the parent tree and publishes all protocol files with no force`() {
        val requests = mutableListOf<Triple<String, String, JSONObject?>>()
        val api =
            GithubApiClient(
                GithubTransport { method, path, body ->
                    requests += Triple(method, path, body)
                    when (path) {
                        "/repos/owner/repo" -> """{"private":true,"permissions":{"push":true},"default_branch":"trunk"}"""
                        "/repos/owner/repo/git/commits/base" -> """{"tree":{"sha":"base-tree"}}"""
                        "/repos/owner/repo/git/trees" -> """{"sha":"new-tree"}"""
                        "/repos/owner/repo/git/commits" -> """{"sha":"candidate"}"""
                        "/repos/owner/repo/git/refs/heads/trunk" -> "{}"
                        else -> error("Unexpected request: $method $path")
                    }
                },
            )
        val remote = api.remote("owner", "repo", "trunk")
        val candidate = remote.prepare("base", emptyMap())
        remote.publish(candidate)
        val tree = requests.single { it.second.endsWith("/trees") }.third!!
        assertThat(tree.getString("base_tree")).isEqualTo("base-tree")
        val entries = tree.getJSONArray("tree")
        assertThat((0 until entries.length()).map { entries.getJSONObject(it).getString("path") }).containsExactly(
            "ritulaya-sync-cycles.json",
            "ritulaya-sync-day-logs.json",
            "ritulaya-sync-settings.json",
            "ritulaya-sync-manifest.json",
        )
        val commit = requests.single { it.second.endsWith("/commits") }.third!!
        assertThat(commit.getJSONArray("parents").getString(0)).isEqualTo("base")
        val publication = requests.last()
        assertThat(publication.first).isEqualTo("PATCH")
        assertThat(publication.third?.getBoolean("force")).isFalse()
        assertThat(publication.third?.getString("sha")).isEqualTo("candidate")
    }

    @Test(expected = IllegalArgumentException::class)
    fun `public repositories fail before publication`() {
        val api =
            GithubApiClient(
                GithubTransport { method, _, _ ->
                    assertThat(method).isEqualTo("GET")
                    """{"private":false,"permissions":{"push":true},"default_branch":"main"}"""
                },
            )
        api.remote("owner", "repo", "main").publish("candidate")
    }
}
