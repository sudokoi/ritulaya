package expo.modules.ritulayapredictions

fun PredictionEngine.Output.toMap(): Map<String, Any?> =
    mapOf(
        "nextPeriodStart" to nextPeriodStart.toString(),
        "nextPeriodEnd" to nextPeriodEnd.toString(),
        "ovulationDay" to ovulationDay.toString(),
        "fertileWindow" to
            mapOf(
                "start" to fertileWindowStart.toString(),
                "end" to fertileWindowEnd.toString(),
            ),
        "confidence" to confidence,
        "cyclesUsed" to cyclesUsed,
        "engine" to engine,
    )
