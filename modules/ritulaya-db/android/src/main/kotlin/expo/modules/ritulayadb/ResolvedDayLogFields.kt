package expo.modules.ritulayadb

/**
 * Omitted/null fields keep their value; clearFields explicitly clears nullable
 * fields. Symptoms use an empty list to clear. The full editor command supplies
 * clearFields for unrecorded values; partial native commands omit untouched fields.
 */

internal class ResolvedDayLogFields(
    val cycleId: String?,
    val flowIntensity: String?,
    val symptomsJson: String,
    val mood: String?,
    val notes: String?,
    val cervicalMucus: String?,
    val bbt: Double?,
    val sexualActivity: Int?,
)

/**
 * Merges a bridge input onto an optional existing row. Pure — no database
 * access — so the clear/keep semantics are unit-testable without Room.
 */
internal fun resolveDayLogFields(
    input: DayLogInput,
    existing: DayLogEntity?,
): ResolvedDayLogFields {
    val incoming =
        mapOf(
            "cycleId" to input.cycleId,
            "flowIntensity" to input.flowIntensity,
            "mood" to input.mood,
            "notes" to input.notes,
            "cervicalMucus" to input.cervicalMucus,
            "bbt" to input.bbt,
            "sexualActivity" to input.sexualActivity,
        )
    require(input.clearFields.all { it in incoming && incoming[it] == null }) { "Invalid or contradictory clear intent" }

    fun <T> resolve(
        field: String,
        value: T?,
        stored: T?,
    ): T? = if (field in input.clearFields) null else value ?: stored
    return ResolvedDayLogFields(
        cycleId = resolve("cycleId", input.cycleId, existing?.cycleId),
        flowIntensity = resolve("flowIntensity", input.flowIntensity, existing?.flowIntensity),
        symptomsJson = input.symptoms?.let(::symptomsToJson) ?: existing?.symptoms ?: "[]",
        mood = resolve("mood", input.mood, existing?.mood),
        notes = resolve("notes", input.notes, existing?.notes),
        cervicalMucus = resolve("cervicalMucus", input.cervicalMucus, existing?.cervicalMucus),
        bbt = resolve("bbt", input.bbt, existing?.bbt),
        sexualActivity = resolve("sexualActivity", input.sexualActivity?.let { if (it) 1 else 0 }, existing?.sexualActivity),
    )
}

private fun symptomsToJson(symptoms: List<String>?): String {
    if (symptoms.isNullOrEmpty()) return "[]"
    return symptoms.joinToString(",", "[", "]") { value ->
        "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\""
    }
}
