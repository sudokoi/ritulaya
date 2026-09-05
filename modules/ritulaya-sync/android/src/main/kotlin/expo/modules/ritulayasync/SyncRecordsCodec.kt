package expo.modules.ritulayasync

import expo.modules.ritulayadb.CycleEntity
import expo.modules.ritulayadb.DayLogEntity
import expo.modules.ritulayadb.RitulayaDataStore
import expo.modules.ritulayadb.SettingsEntity
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate

/** Protocol 2 uses explicit, readable JSON records. Legacy CSV is import-only. */
internal object SyncRecordsCodec {
    const val DIRECTORY = "ritulaya/v2"
    val files = listOf("cycles.json", "day-logs.json", "settings.json", "manifest.json")

    fun capture(snapshot: RitulayaDataStore.SyncSnapshot): SyncRecords =
        buildMap {
            snapshot.cycles.forEach { row ->
                val value = row.value
                put(
                    "cycle:${row.id}",
                    value?.let {
                        mapOf(
                            "id" to it.id,
                            "start_date" to it.startDate,
                            "end_date" to it.endDate,
                            "created_at" to it.createdAt,
                            "updated_at" to it.updatedAt,
                        )
                    },
                )
            }
            snapshot.dayLogs.forEach { row ->
                val value = row.value
                if (value == null) put("legacy:${row.id}", null) else put("day:${value.date}", day(value))
            }
            snapshot.settings?.let { put("settings:default", settings(it)) }
            snapshot.revisions.filter { it.deleted }.forEach { put(it.key, null) }
        }

    private fun day(row: DayLogEntity): SyncRecord =
        mapOf(
            "id" to row.id,
            "date" to row.date,
            "cycle_id" to row.cycleId,
            "flow_intensity" to row.flowIntensity,
            "symptoms" to row.symptoms,
            "mood" to row.mood,
            "notes" to row.notes,
            "cervical_mucus" to row.cervicalMucus,
            "bbt" to row.bbt?.toString(),
            "sexual_activity" to row.sexualActivity.toString(),
            "created_at" to row.createdAt,
            "updated_at" to row.updatedAt,
        )

    private fun settings(row: SettingsEntity): SyncRecord =
        mapOf(
            "avg_cycle_length" to row.avgCycleLength.toString(),
            "avg_period_length" to row.avgPeriodLength.toString(),
            "luteal_phase_length" to row.lutealPhaseLength.toString(),
            "theme" to row.theme,
            "language" to row.language,
            "discreet_mode" to row.discreetMode.toString(),
            "reminder_period_ahead" to row.reminderPeriodAhead.toString(),
            "reminder_daily_log" to row.reminderDailyLog.toString(),
            "created_at" to row.createdAt,
            "updated_at" to row.updatedAt,
        )

    fun encode(records: SyncRecords): Map<String, String> {
        validate(records)
        return mapOf(
            "$DIRECTORY/cycles.json" to SyncProtocol.encodeRecords(records.filterKeys { it.startsWith("cycle:") }).toString(2),
            "$DIRECTORY/day-logs.json" to
                SyncProtocol.encodeRecords(records.filterKeys { it.startsWith("day:") || it.startsWith("legacy:") }).toString(2),
            "$DIRECTORY/settings.json" to SyncProtocol.encodeRecords(records.filterKeys { it.startsWith("settings:") }).toString(2),
            "$DIRECTORY/manifest.json" to
                JSONObject()
                    .put("app", "ritulaya")
                    .put("protocolVersion", 2)
                    .put("schemaVersion", 2)
                    .put("files", JSONArray(files.filter { it != "manifest.json" }))
                    .toString(2),
        )
    }

    fun decode(contents: Map<String, String>): SyncRecords {
        require(contents.keys == files.toSet()) { "Incomplete protocol snapshot" }
        val manifest = JSONObject(contents.getValue("manifest.json"))
        require(
            manifest.getString("app") == "ritulaya" && manifest.get("protocolVersion") == 2 && manifest.get("schemaVersion") == 2,
        ) {
            "Unsupported sync protocol; upgrade required"
        }
        val records = mutableMapOf<String, SyncRecord?>()
        files.filter { it != "manifest.json" }.forEach { file ->
            val part = SyncProtocol.decodeRecords(JSONObject(contents.getValue(file)))
            require(part.keys.none { it in records }) { "Duplicate records" }
            require(
                part.keys.all { key ->
                    when (file) {
                        "cycles.json" -> key.startsWith("cycle:")
                        "day-logs.json" -> key.startsWith("day:") || key.startsWith("legacy:")
                        else -> key == "settings:default"
                    }
                },
            ) { "Unexpected record placement" }
            records.putAll(part)
        }
        validate(records)
        return records
    }

    fun legacy(
        cycles: String?,
        logs: String?,
        settingsJson: String?,
        manifest: String?,
    ): SyncRecords {
        manifest?.let {
            val value = JSONObject(it)
            require(value.getString("app") == "ritulaya" && value.get("schemaVersion") == 1) { "Unsupported legacy schema" }
        }
        require((cycles == null) == (logs == null)) { "Incomplete legacy dataset" }
        val result = mutableMapOf<String, SyncRecord?>()
        cycles?.let { CsvHandler.parseCycles(it) }?.forEach { row ->
            result["cycle:${row.id}"] =
                if (row.deletedAt !=
                    null
                ) {
                    null
                } else {
                    mapOf(
                        "id" to row.id,
                        "start_date" to row.startDate,
                        "end_date" to row.endDate,
                        "created_at" to row.createdAt,
                        "updated_at" to row.updatedAt,
                    )
                }
        }
        logs?.let { CsvHandler.parseDayLogs(it) }?.forEach { row ->
            if (row.deletedAt !=
                null
            ) {
                result["legacy:${row.id}"] = null
            } else {
                result["day:${row.date}"] =
                    day(
                        DayLogEntity(
                            row.id,
                            row.date,
                            row.cycleId,
                            row.flowIntensity,
                            row.symptoms,
                            row.mood,
                            row.notes,
                            row.cervicalMucus,
                            row.bbt,
                            row.sexualActivity,
                            row.createdAt,
                            row.updatedAt,
                        ),
                    )
            }
        }
        settingsJson?.let {
            val value = JSONObject(it)
            val keys =
                mapOf(
                    "avg_cycle_length" to "avgCycleLength",
                    "avg_period_length" to "avgPeriodLength",
                    "luteal_phase_length" to "lutealPhaseLength",
                    "theme" to "theme",
                    "language" to "language",
                    "discreet_mode" to "discreetMode",
                    "reminder_period_ahead" to "reminderPeriodAhead",
                    "reminder_daily_log" to "reminderDailyLog",
                    "updated_at" to "updatedAt",
                )
            result["settings:default"] =
                keys.mapValues { (_, key) -> value.get(key).toString() } + ("created_at" to value.getString("updatedAt"))
        }
        validate(result)
        return result
    }

    fun cycle(row: SyncRecord) =
        CycleEntity(
            row.getValue("id")!!,
            row.getValue("start_date")!!,
            row["end_date"],
            row.getValue("created_at")!!,
            row.getValue("updated_at")!!,
        )

    fun dayEntity(row: SyncRecord) =
        DayLogEntity(
            row.getValue("id")!!,
            row.getValue("date")!!,
            row["cycle_id"],
            row["flow_intensity"],
            row.getValue("symptoms")!!,
            row["mood"],
            row["notes"],
            row["cervical_mucus"],
            row["bbt"]?.toDouble(),
            row.getValue("sexual_activity")!!.toInt(),
            row.getValue("created_at")!!,
            row.getValue("updated_at")!!,
        )

    fun settingsEntity(row: SyncRecord) =
        SettingsEntity(
            avgCycleLength = row.getValue("avg_cycle_length")!!.toInt(),
            avgPeriodLength = row.getValue("avg_period_length")!!.toInt(),
            lutealPhaseLength = row.getValue("luteal_phase_length")!!.toInt(),
            theme = row.getValue("theme")!!,
            language = row.getValue("language")!!,
            discreetMode = row.getValue("discreet_mode")!!.toInt(),
            reminderPeriodAhead = row.getValue("reminder_period_ahead")!!.toInt(),
            reminderDailyLog = row.getValue("reminder_daily_log")!!.toInt(),
            createdAt = row.getValue("created_at")!!,
            updatedAt = row.getValue("updated_at")!!,
        )

    private fun validate(records: SyncRecords) {
        val ids = records.filterKeys { it.startsWith("day:") }.values.mapNotNull { it?.get("id") }
        require(ids.distinct().size == ids.size) { "Duplicate day-entry IDs" }
        records.forEach { (key, row) ->
            require(key.startsWith("cycle:") || key.startsWith("day:") || key.startsWith("legacy:") || key == "settings:default") {
                "Unknown record kind"
            }
            require(key.substringAfter(':').isNotBlank()) { "Missing record identity" }
            if (key.startsWith("day:")) LocalDate.parse(key.removePrefix("day:"))
            if (row == null) {
                require(key != "settings:default") { "Settings cannot be deleted through sync" }
                return@forEach
            }
            val expected =
                when {
                    key.startsWith("cycle:") -> {
                        setOf("id", "start_date", "end_date", "created_at", "updated_at")
                    }

                    key.startsWith(
                        "day:",
                    ) -> {
                        setOf(
                            "id",
                            "date",
                            "cycle_id",
                            "flow_intensity",
                            "symptoms",
                            "mood",
                            "notes",
                            "cervical_mucus",
                            "bbt",
                            "sexual_activity",
                            "created_at",
                            "updated_at",
                        )
                    }

                    else -> {
                        setOf(
                            "avg_cycle_length",
                            "avg_period_length",
                            "luteal_phase_length",
                            "theme",
                            "language",
                            "discreet_mode",
                            "reminder_period_ahead",
                            "reminder_daily_log",
                            "created_at",
                            "updated_at",
                        )
                    }
                }
            require(row.keys == expected) { "Unknown or missing record fields; upgrade required" }
            require(!key.startsWith("legacy:")) { "Legacy deletions cannot contain live data" }
            Instant.parse(row.getValue("created_at"))
            Instant.parse(row.getValue("updated_at"))
            when {
                key.startsWith("cycle:") -> {
                    val entity = cycle(row)
                    require(key == "cycle:${entity.id}")
                    val start = LocalDate.parse(entity.startDate)
                    entity.endDate?.let { require(!LocalDate.parse(it).isBefore(start)) }
                }

                key.startsWith("day:") -> {
                    val entity = dayEntity(row)
                    require(key == "day:${entity.date}" && entity.id.isNotBlank())
                    require(entity.flowIntensity in setOf(null, "none", "spotting", "light", "medium", "heavy"))
                    require(entity.sexualActivity in 0..1)
                    require(entity.bbt?.isFinite() != false)
                    val symptoms = JSONArray(entity.symptoms)
                    val knownSymptoms =
                        setOf(
                            "cramps",
                            "bloating",
                            "headache",
                            "fatigue",
                            "acne",
                            "cravings",
                            "backache",
                            "nausea",
                            "tender_breasts",
                            "insomnia",
                            "dizziness",
                            "hot_flashes",
                            "constipation",
                            "diarrhea",
                            "spotting",
                        )
                    require((0 until symptoms.length()).all { symptoms.get(it) is String && symptoms.getString(it) in knownSymptoms })
                    require(
                        entity.mood in setOf(null, "happy", "calm", "energetic", "anxious", "sad", "angry", "irritable", "tired", "loved"),
                    )
                    require(entity.cervicalMucus in setOf(null, "dry", "sticky", "creamy", "watery", "egg-white"))
                }

                else -> {
                    require("biometric_lock" !in row && "biometricLock" !in row) { "Device policy cannot be synchronized" }
                    val entity = settingsEntity(row)
                    require(entity.avgCycleLength in 15..60 && entity.avgPeriodLength in 1..15 && entity.lutealPhaseLength in 5..20)
                    require(entity.theme in setOf("light", "dark", "system"))
                    require(entity.language in setOf("en", "system", "en-US", "en-GB", "en-IN", "hi", "ja", "ko"))
                    require(entity.discreetMode in 0..1 && entity.reminderDailyLog in 0..1 && entity.reminderPeriodAhead in 0..7)
                }
            }
        }
    }
}

internal class RoomSyncRepository(
    private val store: RitulayaDataStore,
    private val target: String,
) : SyncRepository {
    override suspend fun capture(): LocalSyncView {
        val snapshot = store.readSyncSnapshot()
        return LocalSyncView(
            SyncRecordsCodec.capture(snapshot),
            snapshot.revisions.associate { it.key to it.revision },
            JSONObject(store.syncCheckpoint(target) ?: "{}"),
        )
    }

    override suspend fun save(checkpoint: JSONObject) = store.saveSyncCheckpoint(target, checkpoint.toString())

    override suspend fun complete(
        records: SyncRecords,
        capturedRecords: SyncRecords,
        revisions: Map<String, Long>,
        checkpoint: JSONObject,
    ) = store.completeSync(
        target,
        checkpoint.toString(),
        revisions,
        records
            .filterKeys {
                it.startsWith("cycle:")
            }.mapKeys { it.key.removePrefix("cycle:") }
            .mapValues { it.value?.let(SyncRecordsCodec::cycle) },
        records
            .filterKeys {
                it.startsWith("day:")
            }.mapKeys { it.key.removePrefix("day:") }
            .mapValues { it.value?.let(SyncRecordsCodec::dayEntity) },
        records["settings:default"]?.let(SyncRecordsCodec::settingsEntity),
        SyncProtocol.encodeRecords(capturedRecords).toString(),
    )
}
