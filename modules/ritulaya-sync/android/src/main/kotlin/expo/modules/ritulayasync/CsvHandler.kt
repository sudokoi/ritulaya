package expo.modules.ritulayasync

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
            writer.write(
                writeCsvLine(
                    listOf(
                        row.id,
                        row.startDate,
                        row.endDate ?: "",
                        row.createdAt,
                        row.updatedAt,
                        row.deletedAt ?: "",
                    ),
                ),
            )
            writer.write("\n")
        }
        return writer.toString()
    }

    fun writeDayLogs(rows: List<DayLogRow>): String {
        val writer = StringWriter()
        writer.write(
            "id,date,cycle_id,flow_intensity,symptoms,mood,notes,cervical_mucus,bbt,sexual_activity,created_at,updated_at,deleted_at\n",
        )
        rows.forEach { row ->
            val notes = (row.notes ?: "").replace(Regex("[\\r\\n]+"), " ")
            writer.write(
                writeCsvLine(
                    listOf(
                        row.id,
                        row.date,
                        row.cycleId ?: "",
                        row.flowIntensity ?: "",
                        row.symptoms,
                        row.mood ?: "",
                        notes,
                        row.cervicalMucus ?: "",
                        row.bbt?.toString() ?: "",
                        row.sexualActivity.toString(),
                        row.createdAt,
                        row.updatedAt,
                        row.deletedAt ?: "",
                    ),
                ),
            )
            writer.write("\n")
        }
        return writer.toString()
    }

    private fun writeCsvLine(fields: List<String>): String =
        fields.joinToString(",") { field ->
            if (field.contains(',') || field.contains('"') || field.contains('\n') || field.contains('\r')) {
                "\"" + field.replace("\"", "\"\"") + "\""
            } else {
                field
            }
        }

    private fun parseCycleRow(line: String): CycleRow {
        val parts = parseCsvLine(line)
        return CycleRow(
            id = parts.getOrNull(0) ?: "",
            startDate = parts.getOrNull(1) ?: "",
            endDate = parts.getOrNull(2)?.ifEmpty { null },
            createdAt = parts.getOrNull(3) ?: "",
            updatedAt = parts.getOrNull(4) ?: "",
            deletedAt = parts.getOrNull(5)?.ifEmpty { null },
        )
    }

    private fun parseDayLogRow(line: String): DayLogRow {
        val parts = parseCsvLine(line)
        return DayLogRow(
            id = parts.getOrNull(0) ?: "",
            date = parts.getOrNull(1) ?: "",
            cycleId = parts.getOrNull(2)?.ifEmpty { null },
            flowIntensity = parts.getOrNull(3)?.ifEmpty { null },
            symptoms = parts.getOrNull(4) ?: "[]",
            mood = parts.getOrNull(5)?.ifEmpty { null },
            notes = parts.getOrNull(6)?.ifEmpty { null },
            cervicalMucus = parts.getOrNull(7)?.ifEmpty { null },
            bbt = parts.getOrNull(8)?.toDoubleOrNull(),
            sexualActivity = parts.getOrNull(9)?.toIntOrNull() ?: 0,
            createdAt = parts.getOrNull(10) ?: "",
            updatedAt = parts.getOrNull(11) ?: "",
            deletedAt = parts.getOrNull(12)?.ifEmpty { null },
        )
    }

    private fun parseCsvLine(line: String): List<String> {
        val fields = mutableListOf<String>()
        val current = StringBuilder()
        var inQuotes = false
        var i = 0

        while (i < line.length) {
            val c = line[i]
            when {
                inQuotes -> {
                    if (c == '"') {
                        if (i + 1 < line.length && line[i + 1] == '"') {
                            current.append('"')
                            i++
                        } else {
                            inQuotes = false
                        }
                    } else {
                        current.append(c)
                    }
                }

                c == '"' -> {
                    inQuotes = true
                }

                c == ',' -> {
                    fields.add(current.toString())
                    current.setLength(0)
                }

                else -> {
                    current.append(c)
                }
            }
            i++
        }

        fields.add(current.toString())
        return fields
    }
}
