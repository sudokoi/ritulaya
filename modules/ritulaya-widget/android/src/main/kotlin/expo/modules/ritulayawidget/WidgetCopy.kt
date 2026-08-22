package expo.modules.ritulayawidget

/**
 * Widget display strings. The primary source is the app-persisted snapshot,
 * which carries copy captured from the translation files at compute time — this
 * class only supplies the degraded English fallback for the rare path where
 * the snapshot is missing/stale and the widget must render from live rows.
 */
internal class WidgetCopy internal constructor(
    private val phases: Map<String, String>,
    val today: String,
    private val daysUntilTemplate: String,
    private val dayUntilSingular: String,
) {
    fun phase(phaseKey: String): String = phases[phaseKey] ?: phaseKey

    fun daysUntil(count: Int): String = if (count == 1) dayUntilSingular else String.format(daysUntilTemplate, count)

    companion object {
        fun fallback(): WidgetCopy =
            WidgetCopy(
                phases =
                    mapOf(
                        "menstrual" to "Menstrual Phase",
                        "follicular" to "Follicular Phase",
                        "ovulation" to "Ovulation Phase",
                        "luteal" to "Luteal Phase",
                    ),
                today = "Today",
                daysUntilTemplate = "%d days until next",
                dayUntilSingular = "1 day until next",
            )
    }
}
