package expo.modules.ritulayadb

private fun parseSymptoms(value: String?): List<String> {
    if (value.isNullOrBlank() || value == "[]") return emptyList()
    return try {
        val array = org.json.JSONArray(value)
        (0 until array.length()).map { array.getString(it) }
    } catch (e: Exception) {
        emptyList()
    }
}

fun CycleEntity.toMap(): Map<String, Any?> =
    mapOf(
        "id" to id,
        "startDate" to startDate,
        "endDate" to endDate,
        "createdAt" to createdAt,
        "updatedAt" to updatedAt,
    )

fun DayLogEntity.toMap(): Map<String, Any?> =
    mapOf(
        "id" to id,
        "date" to date,
        "cycleId" to cycleId,
        "flowIntensity" to flowIntensity,
        "symptoms" to parseSymptoms(symptoms),
        "mood" to mood,
        "notes" to notes,
        "cervicalMucus" to cervicalMucus,
        "bbt" to bbt,
        "sexualActivity" to sexualActivity,
        "createdAt" to createdAt,
        "updatedAt" to updatedAt,
    )

fun SettingsEntity.toMap(): Map<String, Any?> =
    mapOf(
        "id" to id,
        "avgCycleLength" to avgCycleLength,
        "avgPeriodLength" to avgPeriodLength,
        "lutealPhaseLength" to lutealPhaseLength,
        "theme" to theme,
        "language" to language,
        "biometricLock" to biometricLock,
        "discreetMode" to discreetMode,
        "reminderPeriodAhead" to reminderPeriodAhead,
        "reminderDailyLog" to reminderDailyLog,
        "createdAt" to createdAt,
        "updatedAt" to updatedAt,
    )
