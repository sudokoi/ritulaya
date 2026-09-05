package expo.modules.ritulayasync

import com.google.common.truth.Truth.assertThat
import org.json.JSONObject
import org.junit.Test

class SyncCompatibilityTest {
    @Test
    fun `legacy multiline notes and recorded No survive JSON migration`() {
        val time = "2026-09-05T00:00:00Z"
        val csv =
            "id,date,cycle_id,flow_intensity,symptoms,mood,notes,cervical_mucus,bbt,sexual_activity,created_at,updated_at,deleted_at\n" +
                "id,2026-09-05,,none,[],calm,\"First line\nSecond, \"\"quoted\"\" line\",creamy,36.6,0,$time,$time,\n"
        val records = SyncRecordsCodec.legacy(CsvHandler.writeCycles(emptyList()), csv, null, null)
        val roundTrip = SyncRecordsCodec.decode(SyncRecordsCodec.encode(records).mapKeys { it.key.substringAfterLast('/') })
        assertThat(roundTrip).isEqualTo(records)
        assertThat(roundTrip.getValue("day:2026-09-05")?.get("notes")).isEqualTo("First line\nSecond, \"quoted\" line")
        assertThat(roundTrip.getValue("day:2026-09-05")?.get("sexual_activity")).isEqualTo("0")
        val unrecorded = records + ("day:2026-09-05" to (records.getValue("day:2026-09-05")!! + ("sexual_activity" to null)))
        val files = SyncRecordsCodec.encode(unrecorded).mapKeys { it.key.substringAfterLast('/') }
        assertThat(JSONObject(files.getValue("manifest.json")).getInt("schemaVersion")).isEqualTo(3)
        assertThat(SyncRecordsCodec.decode(files).getValue("day:2026-09-05")?.get("sexual_activity")).isNull()
    }

    @Test(expected = IllegalArgumentException::class)
    fun `fractional protocol versions are rejected without coercion`() {
        val files = SyncRecordsCodec.encode(emptyMap()).mapKeys { it.key.substringAfterLast('/') }.toMutableMap()
        files["manifest.json"] = JSONObject(files.getValue("manifest.json")).put("protocolVersion", 2.5).toString()
        SyncRecordsCodec.decode(files)
    }

    @Test(expected = IllegalArgumentException::class)
    fun `fractional legacy versions are not migrated`() {
        SyncRecordsCodec.legacy(null, null, null, """{"app":"ritulaya","schemaVersion":1.5}""")
    }

    @Test(expected = IllegalArgumentException::class)
    fun `settings tombstones are rejected rather than acknowledged and resurrected`() {
        SyncRecordsCodec.encode(mapOf("settings:default" to null))
    }
}
