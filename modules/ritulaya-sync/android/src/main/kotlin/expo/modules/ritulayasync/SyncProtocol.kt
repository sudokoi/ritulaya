package expo.modules.ritulayasync

import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

internal typealias SyncRecord = Map<String, String?>
internal typealias SyncRecords = Map<String, SyncRecord?>

internal data class FieldConflict(
    val id: String,
    val key: String,
    val field: String?,
    val local: SyncRecord?,
    val remote: SyncRecord?,
) {
    fun json() =
        JSONObject()
            .put("id", id)
            .put("key", key)
            .put("field", field ?: JSONObject.NULL)
            .put("local", local?.let(SyncProtocol::encodeRecord) ?: JSONObject.NULL)
            .put("remote", remote?.let(SyncProtocol::encodeRecord) ?: JSONObject.NULL)
}

/** No wall-clock ordering: compare meaning against the device's accepted common baseline. */
internal object ThreeWayMerge {
    data class Result(
        val records: SyncRecords,
        val conflicts: List<FieldConflict>,
    )

    private val metadata = setOf("id", "created_at", "updated_at")

    private fun meaning(row: SyncRecord?) = row?.filterKeys { it !in metadata }

    fun merge(
        base: SyncRecords,
        local: SyncRecords,
        remote: SyncRecords,
    ): Result {
        val result = linkedMapOf<String, SyncRecord?>()
        val conflicts = mutableListOf<FieldConflict>()
        for (key in (base.keys + local.keys + remote.keys).sorted()) {
            val b = base[key]
            val l = local[key]
            val r = remote[key]

            fun same(
                a: SyncRecords,
                av: SyncRecord?,
                c: SyncRecords,
                cv: SyncRecord?,
            ) = a.containsKey(key) == c.containsKey(key) && meaning(av) == meaning(cv)
            val merged =
                when {
                    same(local, l, remote, r) -> {
                        r ?: l
                    }

                    same(local, l, base, b) -> {
                        r
                    }

                    same(remote, r, base, b) -> {
                        l
                    }

                    l == null || r == null -> {
                        conflicts += FieldConflict(conflicts.size.toString(), key, null, l, r)
                        l
                    }

                    else -> {
                        val fields = l.toMutableMap()
                        for (field in (l.keys + r.keys + (b?.keys ?: emptySet())).sorted()) {
                            fields[field] =
                                when {
                                    field == "updated_at" -> {
                                        listOfNotNull(l[field], r[field]).maxOrNull()
                                    }

                                    field in metadata -> {
                                        listOfNotNull(l[field], r[field]).minOrNull()
                                    }

                                    l[field] == r[field] -> {
                                        l[field]
                                    }

                                    b != null && l[field] == b[field] -> {
                                        r[field]
                                    }

                                    b != null && r[field] == b[field] -> {
                                        l[field]
                                    }

                                    else -> {
                                        conflicts += FieldConflict(conflicts.size.toString(), key, field, l, r)
                                        l[field]
                                    }
                                }
                        }
                        fields
                    }
                }
            result[key] = merged
        }
        return Result(result, conflicts)
    }
}

internal data class LocalSyncView(
    val records: SyncRecords,
    val revisions: Map<String, Long>,
    val checkpoint: JSONObject,
)

internal data class RemoteSyncView(
    val records: SyncRecords,
    val migration: Boolean,
)

internal interface SyncRepository {
    suspend fun capture(): LocalSyncView

    suspend fun save(checkpoint: JSONObject)

    suspend fun complete(
        records: SyncRecords,
        capturedRecords: SyncRecords,
        revisions: Map<String, Long>,
        checkpoint: JSONObject,
    )
}

internal interface GitSyncRemote {
    fun head(): String

    fun read(commit: String): RemoteSyncView

    fun prepare(
        parent: String,
        records: SyncRecords,
        migrateLegacy: Boolean = false,
    ): String

    fun publish(commit: String)

    fun contains(
        ancestor: String,
        head: String,
    ): Boolean
}

internal class SyncReviewRequired(
    val reason: String,
) : Exception(reason)

internal class SyncPublicationMoved : Exception("Remote branch changed")

/** One resumable protocol shared by foreground and WorkManager callers. */
internal class SyncProtocol(
    private val local: SyncRepository,
    private val remote: GitSyncRemote,
) {
    suspend fun run() {
        repeat(3) {
            var view = local.capture()
            var state = view.checkpoint
            var head = remote.head()
            val attempt = state.optJSONObject("attempt")
            if (attempt != null) {
                val candidate = attempt.getString("candidate")
                val staleChoice = attempt.optBoolean("reviewBound") && decodeRevisions(attempt.getJSONObject("revisions")) != view.revisions
                if (!staleChoice && !remote.contains(candidate, head) && head == attempt.getString("parent")) {
                    try {
                        remote.publish(candidate)
                    } catch (_: SyncPublicationMoved) {
                        return@repeat
                    }
                    head = remote.head()
                }
                if (remote.contains(candidate, head)) {
                    finish(state, attempt)
                    view = local.capture()
                    state = view.checkpoint
                } else {
                    state.remove("attempt")
                    local.save(state)
                }
            }

            val accepted = state.optString("baseCommit")
            require(accepted.isEmpty() || remote.contains(accepted, head)) { "Remote history no longer contains the accepted baseline" }
            val incoming = remote.read(head)
            require(accepted.isEmpty() || !incoming.migration) { "Accepted protocol snapshot is missing; restore it before syncing" }
            val acceptedRecords = decodeRecords(state.optJSONObject("base") ?: JSONObject())
            require(
                incoming.migration ||
                    acceptedRecords.keys.all {
                        it in incoming.records
                    },
            ) { "Missing accepted records; use explicit deletion markers" }
            if (incoming.migration && state.optString("approvedMigration") != head) {
                state.put("review", JSONObject().put("id", UUID.randomUUID().toString()).put("kind", "migration").put("head", head))
                local.save(state)
                throw SyncReviewRequired("migration")
            }
            val base = if (state.optBoolean("rebasePending")) decodeRecords(state.getJSONObject("localBase")) else acceptedRecords
            val normalized = normalizeLegacy(view.records, incoming.records)
            val canonical = canonicalCycles(listOf(base, normalized.first, normalized.second))
            val merged = ThreeWayMerge.merge(canonical[0], canonical[1], canonical[2])
            val review = state.optJSONObject("review")
            val sameReview =
                review?.optString("head") == head &&
                    review.optJSONObject("revisions")?.let(::decodeRevisions) == view.revisions
            val records =
                if (sameReview && review?.has("resolved") == true) {
                    decodeRecords(review.getJSONObject("resolved"))
                } else if (merged.conflicts.isNotEmpty()) {
                    state.put(
                        "review",
                        JSONObject()
                            .put("id", UUID.randomUUID().toString())
                            .put("kind", "conflicts")
                            .put("head", head)
                            .put("revisions", revisionsJson(view.revisions))
                            .put("merged", encodeRecords(merged.records))
                            .put("conflicts", JSONArray(merged.conflicts.map { it.json() })),
                    )
                    local.save(state)
                    throw SyncReviewRequired("conflicts")
                } else {
                    merged.records
                }

            validateRelationships(records)
            if (!incoming.migration && records == incoming.records) {
                finish(
                    state,
                    JSONObject()
                        .put("candidate", head)
                        .put("records", encodeRecords(records))
                        .put("capturedRecords", encodeRecords(view.records))
                        .put("revisions", revisionsJson(view.revisions)),
                )
                return
            }
            val candidate = remote.prepare(head, records, migrateLegacy = incoming.migration)
            val prepared =
                JSONObject()
                    .put("reviewBound", sameReview && review?.has("resolved") == true)
                    .put("parent", head)
                    .put("candidate", candidate)
                    .put("records", encodeRecords(records))
                    .put("capturedRecords", encodeRecords(view.records))
                    .put("revisions", revisionsJson(view.revisions))
            state.put("attempt", prepared)
            local.save(state) // Durable before the only externally visible write.
            if (prepared.optBoolean("reviewBound") && local.capture().revisions != view.revisions) return@repeat
            try {
                remote.publish(candidate)
            } catch (_: SyncPublicationMoved) {
                return@repeat
            }
            finish(state, prepared)
            return
        }
        throw SyncPublicationMoved()
    }

    private suspend fun finish(
        state: JSONObject,
        attempt: JSONObject,
    ) {
        val records = decodeRecords(attempt.getJSONObject("records"))
        val revisions = attempt.getJSONObject("revisions").let { o -> o.keys().asSequence().associateWith { o.getLong(it) } }
        val next = JSONObject(state.toString()).put("baseCommit", attempt.getString("candidate")).put("base", encodeRecords(records))
        next.remove("attempt")
        next.remove("review")
        next.remove("approvedMigration")
        local.complete(records, decodeRecords(attempt.getJSONObject("capturedRecords")), revisions, next)
    }

    suspend fun resolve(
        reviewId: String,
        choices: Map<String, String>,
    ) {
        val view = local.capture()
        val state = view.checkpoint
        val review = requireNotNull(state.optJSONObject("review")) { "No pending review" }
        require(review.getString("id") == reviewId) { "Review has changed" }
        if (review.getString("kind") == "migration") {
            require(choices == mapOf("migration" to "approve")) { "Migration confirmation required" }
            state.put("approvedMigration", review.getString("head"))
            state.remove("review")
        } else {
            require(decodeRevisions(review.getJSONObject("revisions")) == view.revisions) {
                "Local data changed; sync again to refresh review"
            }
            val records = decodeRecords(review.getJSONObject("merged")).toMutableMap()
            val conflicts = review.getJSONArray("conflicts")
            require(choices.size == conflicts.length()) { "Resolve every conflict" }
            for (i in 0 until conflicts.length()) {
                val conflict = conflicts.getJSONObject(i)
                val side = choices[conflict.getString("id")]
                require(side == "local" || side == "remote") { "Invalid conflict choice" }
                val key = conflict.getString("key")
                val chosen = conflict.optJSONObject(side)?.let(::decodeRecord)
                if (conflict.isNull("field")) {
                    records[key] = chosen
                } else {
                    val field = conflict.getString("field")
                    records[key] = requireNotNull(records[key]).toMutableMap().apply { put(field, chosen?.get(field)) }
                }
            }
            validateRelationships(records)
            review.put("resolved", encodeRecords(records))
        }
        local.save(state)
    }

    companion object {
        private fun decodeRevisions(json: JSONObject): Map<String, Long> = json.keys().asSequence().associateWith { json.getLong(it) }

        private fun canonicalCycles(snapshots: List<SyncRecords>): List<SyncRecords> {
            snapshots.forEach { snapshot ->
                val starts = snapshot.filterKeys { it.startsWith("cycle:") }.values.mapNotNull { it?.get("start_date") }
                require(starts.size == starts.distinct().size) { "Duplicate cycle starts require repair before sync" }
            }
            val cycles = snapshots.flatMap { it.filterKeys { key -> key.startsWith("cycle:") }.values.filterNotNull() }
            val canonical =
                cycles
                    .groupBy { it["start_date"] }
                    .values
                    .flatMap { group ->
                        val id = requireNotNull(group.mapNotNull { it["id"] }.minOrNull())
                        group.mapNotNull { row -> row["id"]?.let { it to id } }
                    }.toMap()
            return snapshots.map { snapshot ->
                buildMap {
                    snapshot.entries.sortedBy { it.value != null }.forEach { (key, row) ->
                        if (row != null && key.startsWith("cycle:")) {
                            val id = canonical.getValue(requireNotNull(row["id"]))
                            if (key != "cycle:$id") put(key, null)
                            put("cycle:$id", row + ("id" to id))
                        } else if (row != null && key.startsWith("day:") && row["cycle_id"] != null) {
                            put(key, row + ("cycle_id" to (canonical[row["cycle_id"]] ?: row["cycle_id"])))
                        } else {
                            put(key, row)
                        }
                    }
                }
            }
        }

        fun encodeRecords(records: SyncRecords) =
            JSONObject().apply {
                records.toSortedMap().forEach { (key, value) -> put(key, value?.let(::encodeRecord) ?: JSONObject.NULL) }
            }

        fun encodeRecord(record: SyncRecord) =
            JSONObject().apply {
                record.toSortedMap().forEach { (field, value) -> put(field, value ?: JSONObject.NULL) }
            }

        fun decodeRecord(json: JSONObject): SyncRecord =
            json.keys().asSequence().associateWith {
                if (json.isNull(it)) {
                    null
                } else {
                    json.get(it).also { value ->
                        require(value is String) { "Invalid record field type" }
                    } as String
                }
            }

        fun decodeRecords(json: JSONObject): SyncRecords =
            json.keys().asSequence().associateWith {
                if (json.isNull(it)) null else decodeRecord(json.getJSONObject(it))
            }

        fun revisionsJson(revisions: Map<String, Long>) = JSONObject(revisions.toSortedMap())

        private fun normalizeLegacy(
            local: SyncRecords,
            remote: SyncRecords,
        ): Pair<SyncRecords, SyncRecords> {
            val ids =
                (local + remote)
                    .filterKeys { it.startsWith("day:") }
                    .entries
                    .mapNotNull { (key, row) -> row?.get("id")?.let { it to key } }
                    .toMap()

            fun expand(rows: SyncRecords) =
                rows.toMutableMap().apply {
                    rows.filterKeys { it.startsWith("legacy:") }.forEach { (key, _) ->
                        ids[key.removePrefix("legacy:")]?.let { if (!containsKey(it)) put(it, null) }
                    }
                }
            return expand(local) to expand(remote)
        }

        private fun validateRelationships(records: SyncRecords) {
            val starts = records.filterKeys { it.startsWith("cycle:") }.values.mapNotNull { it?.get("start_date") }
            require(starts.distinct().size == starts.size) { "Conflicting cycle starts need correction before sync" }
            records.filterKeys { it.startsWith("day:") }.values.filterNotNull().forEach { row ->
                val cycle = row["cycle_id"]
                require(cycle == null || records["cycle:$cycle"] != null) { "Entry references a missing cycle; repair before sync" }
            }
        }
    }
}
