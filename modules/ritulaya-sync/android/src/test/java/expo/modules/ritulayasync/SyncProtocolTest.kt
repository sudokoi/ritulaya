package expo.modules.ritulayasync

import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Test

class SyncProtocolTest {
    @Test
    fun `an accepted v2 target cannot fall back to stale legacy files`(): Unit =
        runBlocking {
            val local = Local(mapOf(key to entry()))
            local.state.put("baseCommit", "initial").put("base", SyncProtocol.encodeRecords(local.records))
            val remote = Remote(emptyMap()).apply { migration = true }
            try {
                SyncProtocol(local, remote).run()
                error("Expected missing protocol rejection")
            } catch (_: IllegalArgumentException) {
            }
            assertThat(local.state.has("review")).isFalse()
            assertThat(remote.publications).isEqualTo(0)
            assertThat(local.records[key]).isEqualTo(entry())
        }

    @Test
    fun `an offline first-sync record conflicts with an explicit remote deletion`() {
        val result = ThreeWayMerge.merge(emptyMap(), mapOf(key to entry()), mapOf(key to null))
        assertThat(result.conflicts).hasSize(1)
    }

    @Test
    fun `omission of an accepted remote record is not treated as deletion`(): Unit =
        runBlocking {
            val local = Local(mapOf(key to entry()))
            local.state.put("baseCommit", "initial").put("base", SyncProtocol.encodeRecords(local.records))
            val remote = Remote(emptyMap())
            try {
                SyncProtocol(local, remote).run()
                error("Expected missing-record rejection")
            } catch (_: IllegalArgumentException) {
            }
            assertThat(remote.publications).isEqualTo(0)
        }

    @Test
    fun `recovery rejects stale resolved choices before publishing its prepared candidate`(): Unit =
        runBlocking {
            val local = Local(mapOf(key to entry("local")))
            val remote = Remote(mapOf(key to entry("remote")))
            val protocol = SyncProtocol(local, remote)
            try {
                protocol.run()
                error("Expected conflict")
            } catch (_: SyncReviewRequired) {
            }
            protocol.resolve(local.state.getJSONObject("review").getString("id"), mapOf("0" to "local"))
            remote.beforePublish = { throw java.io.IOException("simulated interruption before publication") }
            try {
                protocol.run()
                error("Expected interruption")
            } catch (_: java.io.IOException) {
            }
            local.records = mapOf(key to entry("new edit"))
            local.revisions = mapOf(key to 2L)
            try {
                protocol.run()
                error("Expected refreshed conflict")
            } catch (_: SyncReviewRequired) {
            }
            assertThat(remote.publications).isEqualTo(0)
        }

    @Test
    fun `late local edits rebase without undoing an unrelated remote change`(): Unit =
        runBlocking {
            val local = Local(mapOf(key to entry("first local edit")))
            val remote = Remote(mapOf(key to entry(mood = "sad")))
            local.state.put("baseCommit", "initial").put("base", SyncProtocol.encodeRecords(mapOf(key to entry())))
            remote.beforePublish = {
                local.records = mapOf(key to entry("late local edit"))
                local.revisions = mapOf(key to 2L)
            }
            SyncProtocol(local, remote).run()
            SyncProtocol(local, remote).run()
            assertThat(remote.commits.getValue(remote.head)[key]).isEqualTo(entry("late local edit", "sad"))
        }

    private val key = "day:2026-06-01"

    private fun entry(
        note: String = "original",
        mood: String = "calm",
    ) = mapOf("notes" to note, "mood" to mood)

    private class Local(
        var records: SyncRecords,
        var revisions: Map<String, Long> = mapOf("day:2026-06-01" to 1L),
    ) : SyncRepository {
        var state = JSONObject()
        var failCompletion = false

        override suspend fun capture() = LocalSyncView(records, revisions, JSONObject(state.toString()))

        override suspend fun save(checkpoint: JSONObject) {
            state = JSONObject(checkpoint.toString())
        }

        override suspend fun complete(
            records: SyncRecords,
            capturedRecords: SyncRecords,
            revisions: Map<String, Long>,
            checkpoint: JSONObject,
        ) {
            if (failCompletion) throw IllegalStateException("simulated crash")
            val unchanged = this.revisions == revisions
            if (unchanged) this.records = records
            state =
                checkpoint
                    .put("rebasePending", !unchanged)
                    .put("localBase", SyncProtocol.encodeRecords(if (unchanged) emptyMap() else capturedRecords))
        }
    }

    private class Remote(
        initial: SyncRecords,
    ) : GitSyncRemote {
        var head = "initial"
        var migration = false
        val commits = mutableMapOf("initial" to initial)
        val parents = mutableMapOf<String, String>()
        var publications = 0
        var beforePublish: (() -> Unit)? = null

        override fun head() = head

        override fun read(commit: String) = RemoteSyncView(commits.getValue(commit), migration)

        override fun prepare(
            parent: String,
            records: SyncRecords,
        ): String {
            val id = "commit-${commits.size}"
            commits[id] = records
            parents[id] = parent
            return id
        }

        override fun publish(commit: String) {
            beforePublish?.also { beforePublish = null }?.invoke()
            if (parents[commit] != head) throw SyncPublicationMoved()
            head = commit
            publications++
            migration = false
        }

        override fun contains(
            ancestor: String,
            head: String,
        ): Boolean = ancestor == head || parents[head]?.let { contains(ancestor, it) } == true
    }

    @Test
    fun `independent field edits combine without ordering timestamps`() {
        val base = mapOf(key to entry())
        val merged = ThreeWayMerge.merge(base, mapOf(key to entry(note = "local")), mapOf(key to entry(mood = "sad")))
        assertThat(merged.conflicts).isEmpty()
        assertThat(merged.records[key]).isEqualTo(entry("local", "sad"))
    }

    @Test
    fun `same field conflicts even with a future remote timestamp`() {
        val base = mapOf(key to entry())
        val merged =
            ThreeWayMerge.merge(
                base,
                mapOf(key to entry("local")),
                mapOf(key to (entry("remote") + ("updated_at" to "2099-01-01T00:00:00Z"))),
            )
        assertThat(merged.conflicts.map { it.field }).containsExactly("notes")
    }

    @Test
    fun `deletion conflicts with edit but propagates against an unchanged record`() {
        val base = mapOf(key to entry())
        assertThat(ThreeWayMerge.merge(base, mapOf(key to null), mapOf(key to entry("changed"))).conflicts).hasSize(1)
        assertThat(ThreeWayMerge.merge(base, mapOf(key to null), base).records[key]).isNull()
    }

    @Test
    fun `first sync does not invent a common baseline`() {
        assertThat(ThreeWayMerge.merge(emptyMap(), mapOf(key to entry("local")), mapOf(key to entry("remote"))).conflicts).hasSize(1)
    }

    @Test
    fun `migration needs confirmation bound to the inspected remote head`(): Unit =
        runBlocking {
            val local = Local(mapOf(key to entry()))
            val remote = Remote(emptyMap()).apply { migration = true }
            val protocol = SyncProtocol(local, remote)
            try {
                protocol.run()
                error("Expected confirmation")
            } catch (
                review: SyncReviewRequired,
            ) {
                assertThat(review.reason).isEqualTo("migration")
            }
            assertThat(remote.publications).isEqualTo(0)
            protocol.resolve(local.state.getJSONObject("review").getString("id"), mapOf("migration" to "approve"))
            protocol.run()
            assertThat(remote.publications).isEqualTo(1)
            assertThat(remote.commits.getValue(remote.head)[key]).isEqualTo(entry())
        }

    @Test
    fun `a crash after remote publication recovers acknowledgement without losing a new local edit`(): Unit =
        runBlocking {
            val local = Local(mapOf(key to entry()))
            val remote = Remote(emptyMap())
            local.failCompletion = true
            try {
                SyncProtocol(local, remote).run()
                error("Expected crash")
            } catch (_: IllegalStateException) {
            }
            assertThat(local.state.has("attempt")).isTrue()
            assertThat(remote.publications).isEqualTo(1)
            local.records = mapOf(key to entry("new edit"))
            local.revisions = mapOf(key to 2L)
            local.failCompletion = false
            SyncProtocol(local, remote).run()
            assertThat(local.records[key]?.get("notes")).isEqualTo("new edit")
            assertThat(remote.commits.getValue(remote.head)[key]?.get("notes")).isEqualTo("new edit")
            assertThat(local.state.has("attempt")).isFalse()
        }

    @Test
    fun `a competing Git commit causes remerge rather than force publication`(): Unit =
        runBlocking {
            val local = Local(mapOf(key to entry("local")))
            val remote = Remote(emptyMap())
            remote.beforePublish = {
                remote.commits["other"] = mapOf("day:2026-06-02" to entry("other"))
                remote.parents["other"] = "initial"
                remote.head = "other"
            }
            SyncProtocol(local, remote).run()
            assertThat(remote.commits.getValue(remote.head).keys).containsExactly(key, "day:2026-06-02")
            assertThat(remote.publications).isEqualTo(1)
        }

    @Test
    fun `conflict choices are persisted and stale choices are not applied`(): Unit =
        runBlocking {
            val local = Local(mapOf(key to entry("local")))
            val remote = Remote(mapOf(key to entry("remote")))
            val protocol = SyncProtocol(local, remote)
            try {
                protocol.run()
                error("Expected conflict")
            } catch (_: SyncReviewRequired) {
            }
            val review = local.state.getJSONObject("review")
            protocol.resolve(review.getString("id"), mapOf("0" to "remote"))
            local.records = mapOf(key to entry("changed during review"))
            local.revisions = mapOf(key to 2L)
            try {
                protocol.run()
                error("Expected fresh conflict")
            } catch (_: SyncReviewRequired) {
            }
            assertThat(remote.publications).isEqualTo(0)
            assertThat(local.state.getJSONObject("review").getString("id")).isNotEqualTo(review.getString("id"))
        }
}
