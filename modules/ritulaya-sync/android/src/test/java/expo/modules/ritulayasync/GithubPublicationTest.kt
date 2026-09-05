package expo.modules.ritulayasync

import com.google.common.truth.Truth.assertThat
import org.json.JSONObject
import org.junit.Test

class GithubPublicationTest {
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
            "ritulaya/v2/cycles.json",
            "ritulaya/v2/day-logs.json",
            "ritulaya/v2/settings.json",
            "ritulaya/v2/manifest.json",
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
