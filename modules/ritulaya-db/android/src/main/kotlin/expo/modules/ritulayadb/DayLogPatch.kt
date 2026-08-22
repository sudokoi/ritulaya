package expo.modules.ritulayadb

/**
 * The day-log patch convention, defined once: a field sent as null keeps its
 * stored value, an empty string explicitly clears a text field, and 0.0
 * explicitly clears BBT (an impossible body temperature). The only JS
 * producer of these sentinels is saveDayEntry in src/domain/day-entry.ts;
 * resolveDayLogFields below is the only decoder.
 */
internal const val CLEAR_TEXT = ""

internal const val CLEAR_BBT = 0.0

/** Field values after the patch has been resolved against the stored row. */
internal class ResolvedDayLogFields(
    val cycleId: String?,
    val flowIntensity: String?,
    val symptomsJson: String,
    val mood: String?,
    val notes: String?,
    val cervicalMucus: String?,
    val bbt: Double?,
    val sexualActivity: Int,
)

/**
 * Merges a bridge input onto an optional existing row. Pure — no database
 * access — so the clear/keep semantics are unit-testable without Room.
 */
internal fun resolveDayLogFields(
    input: DayLogInput,
    existing: DayLogEntity?,
): ResolvedDayLogFields =
    ResolvedDayLogFields(
        cycleId = input.cycleId ?: existing?.cycleId,
        flowIntensity = input.flowIntensity ?: existing?.flowIntensity,
        symptomsJson = symptomsToJson(input.symptoms),
        mood = resolveText(input.mood, existing?.mood),
        notes = resolveText(input.notes, existing?.notes),
        cervicalMucus = resolveText(input.cervicalMucus, existing?.cervicalMucus),
        bbt = if (input.bbt == CLEAR_BBT) null else input.bbt ?: existing?.bbt,
        sexualActivity =
            input.sexualActivity?.let { if (it) 1 else 0 }
                ?: existing?.sexualActivity
                ?: 0,
    )

private fun resolveText(
    incoming: String?,
    stored: String?,
): String? = if (incoming == CLEAR_TEXT) null else incoming ?: stored

private fun symptomsToJson(symptoms: List<String>?): String {
    if (symptoms.isNullOrEmpty()) return "[]"
    return symptoms.joinToString(",", "[", "]") { value ->
        "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\""
    }
}
