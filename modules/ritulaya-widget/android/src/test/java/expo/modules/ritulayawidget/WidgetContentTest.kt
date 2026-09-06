package expo.modules.ritulayawidget

import org.junit.Assert.assertEquals
import org.junit.Test

class WidgetContentTest {
    private val copy = WidgetCopy(mapOf("luteal" to "localized phase"), "localized today", "%d remaining", "one remaining")

    @Test
    fun `private widget removes cycle day phase and countdown`() {
        assertEquals(WidgetContent("", "localized today", ""), WidgetContent.from(24, "luteal", 4, true, copy))
    }

    @Test
    fun `unanchored widget does not invent a countdown`() {
        for (day in listOf(0, -3)) assertEquals(WidgetContent("", "localized today", ""), WidgetContent.from(day, "luteal", 4, false, copy))
    }

    @Test
    fun `normal anchored widget uses localized copy with a nonnegative countdown`() {
        assertEquals(WidgetContent("24", "localized phase", "one remaining"), WidgetContent.from(24, "luteal", 1, false, copy))
        assertEquals(WidgetContent("24", "localized phase", "0 remaining"), WidgetContent.from(24, "luteal", -2, false, copy))
    }
}
