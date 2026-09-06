package expo.modules.ritulayawidget

internal data class WidgetContent(
    val day: String,
    val phase: String,
    val countdown: String,
) {
    companion object {
        fun from(
            day: Int,
            phase: String,
            daysUntil: Int,
            privateMode: Boolean,
            copy: WidgetCopy,
        ): WidgetContent {
            if (privateMode || day <= 0) return WidgetContent("", copy.today, "")
            return WidgetContent(day.toString(), copy.phase(phase), copy.daysUntil(maxOf(0, daysUntil)))
        }
    }
}
