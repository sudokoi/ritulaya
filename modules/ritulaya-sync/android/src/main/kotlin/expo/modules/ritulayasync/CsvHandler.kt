package expo.modules.ritulayasync

import android.util.Base64
import org.json.JSONObject
import java.io.BufferedReader
import java.io.StringReader
import java.io.StringWriter

object CsvHandler {
    data class CycleRow(
        val id: String,
        val startDate: String,
        val endDate: String?,
        val createdAt: String,
        val updatedAt: String,
        val deletedAt: String?,
    )

    data class DayLogRow(
        val id: String,
        val date: String,
        val cycleId: String?,
        val flowIntensity: String?,
        val symptoms: String,
        val mood: String?,
        val notes: String?,
        val cervicalMucus: String?,
        val bbt: Double?,
        val sexualActivity: Int,
        val createdAt: String,
        val updatedAt: String,
        val deletedAt: String?,
    )

    fun parseCycles(csv: String): List<CycleRow> {
        val reader = BufferedReader(StringReader(csv))
        val headers = reader.readLine()?.split(",") ?: return emptyList()
        if (headers.isEmpty() || headers[0] != "id") return emptyList()

        return reader
            .lineSequence()
            .filter { it.isNotBlank() }
            .map { parseCycleRow(it) }
            .toList()
    }

    fun parseDayLogs(csv: String): List<DayLogRow> {
        val reader = BufferedReader(StringReader(csv))
        val headers = reader.readLine()?.split(",") ?: return emptyList()
        if (headers.isEmpty() || headers[0] != "id") return emptyList()

        return reader
            .lineSequence()
            .filter { it.isNotBlank() }
            .map { parseDayLogRow(it) }
            .toList()
    }

    fun writeCycles(rows: List<CycleRow>): String {
        val writer = StringWriter()
        writer.write("id,start_date,end_date,created_at,updated_at,deleted_at\n")
        rows.forEach { row ->
            writer.write("${row.id},${row.startDate},${row.endDate ?: ""},${row.createdAt},${row.updatedAt},${row.deletedAt ?: ""}\n")
        }
        return writer.toString()
    }

    fun writeDayLogs(rows: List<DayLogRow>): String {
        val writer = StringWriter()
        writer.write(
            "id,date,cycle_id,flow_intensity,symptoms,mood,notes,cervical_mucus,bbt,sexual_activity,created_at,updated_at,deleted_at\n",
        )
        rows.forEach { row ->
            val symptoms = encode(row.symptoms)
            val notes = encode(row.notes ?: "")
            writer.write(
                "${row.id},${row.date},${row.cycleId ?: ""},${row.flowIntensity ?: ""},$symptoms,${row.mood ?: ""},$notes,${row.cervicalMucus ?: ""},${row.bbt ?: ""},${row.sexualActivity},${row.createdAt},${row.updatedAt},${row.deletedAt ?: ""}\n",
            )
        }
        return writer.toString()
    }

    fun writeManifest(): String =
        JSONObject()
            .apply {
                put("app", "ritulaya")
                put("appVersion", "0.1.0")
                put("schemaVersion", 1)
                put("sharing", JSONObject.NULL)
            }.toString(2)

    private fun parseCycleRow(line: String): CycleRow {
        val parts = line.split(",")
        return CycleRow(
            id = parts[0],
            startDate = parts[1],
            endDate = parts.getOrNull(2)?.ifEmpty { null },
            createdAt = parts.getOrNull(3) ?: "",
            updatedAt = parts.getOrNull(4) ?: "",
            deletedAt = parts.getOrNull(5)?.ifEmpty { null },
        )
    }

    private fun parseDayLogRow(line: String): DayLogRow {
        val parts = line.split(",")
        return DayLogRow(
            id = parts[0],
            date = parts[1],
            cycleId = parts.getOrNull(2)?.ifEmpty { null },
            flowIntensity = parts.getOrNull(3)?.ifEmpty { null },
            symptoms = decode(parts.getOrNull(4) ?: "[]"),
            mood = parts.getOrNull(5)?.ifEmpty { null },
            notes = decode(parts.getOrNull(6) ?: "").ifEmpty { null },
            cervicalMucus = parts.getOrNull(7)?.ifEmpty { null },
            bbt = parts.getOrNull(8)?.toDoubleOrNull(),
            sexualActivity = parts.getOrNull(9)?.toIntOrNull() ?: 0,
            createdAt = parts.getOrNull(10) ?: "",
            updatedAt = parts.getOrNull(11) ?: "",
            deletedAt = parts.getOrNull(12)?.ifEmpty { null },
        )
    }

    private fun encode(value: String): String = Base64.encodeToString(value.toByteArray(Charsets.UTF_8), Base64.NO_WRAP)

    private fun decode(value: String): String =
        try {
            String(Base64.decode(value, Base64.DEFAULT), Charsets.UTF_8)
        } catch (e: Exception) {
            value
        }
}
