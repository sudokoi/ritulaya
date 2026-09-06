package expo.modules.ritulayalogger

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DiagnosticPolicyTest {
    private fun entry(metadata: String? = null) =
        LogEntity(
            timestamp = 1,
            level = "error",
            tag = "app",
            message = "Initialization failed",
            metadata = metadata,
        )

    @Test fun `retain finite technical context and export environment without raw errors`() {
        val safe =
            DiagnosticPolicy.project(
                entry(
                    """{"errorType":"TypeError","errorCode":"ERR_UNEXPECTED","httpStatus":503,"message":"secret notes","stack":"private path","token":"ghp_secret","cause":{"notes":"private"}}""",
                ),
            )
        val metadata = JSONObject(requireNotNull(safe.metadata))
        assertEquals(setOf("errorType", "errorCode", "httpStatus"), metadata.keys().asSequence().toSet())
        assertEquals("TypeError", metadata.getString("errorType"))
        assertEquals("ERR_UNEXPECTED", metadata.getString("errorCode"))
        assertEquals(503, metadata.getInt("httpStatus"))
        val exported = DiagnosticPolicy.export(listOf(safe), "0.1.2", 36)
        assertTrue(exported.contains("app=0.1.2 | androidApi=36"))
        assertTrue(exported.contains("Initialization failed"))
        assertFalse(exported.contains("private"))
        assertFalse(exported.contains("secret"))
    }

    @Test fun `export projects legacy rows rather than trusting stored free text`() {
        val legacy =
            entry(
                """{"errorType":"https://private-repo","errorCode":"ghp_secret","notes":"health","symptoms":["cramps"],"bbt":36.6,"date":"2026-09-05"}""",
            ).copy(level = "secret", tag = "private-owner/repo", message = "unstructured health content")
        val result = DiagnosticPolicy.export(listOf(legacy), "0.1.2", 36)
        assertEquals("Ritulaya diagnostics v1 | app=0.1.2 | androidApi=36 | newest first\n[ERROR] app: Diagnostic details omitted", result)
    }

    @Test fun `known tag does not authorize arbitrary messages and numeric strings are dropped`() {
        val result =
            DiagnosticPolicy.project(
                entry(
                    """{"errorType":{"token":"secret"},"errorCode":["ERR_UNEXPECTED"],"httpStatus":"503"}""",
                ).copy(message = "Refresh failed\nprivate health content"),
            )
        assertEquals("Diagnostic details omitted", result.message)
        assertNull(result.metadata)
    }

    @Test fun `malformed oversized or absent metadata fails closed without losing event context`() {
        for (metadata in listOf(null, "not json", "{}", "{".repeat(4097), """{"httpStatus":36.6}""")) {
            val result = DiagnosticPolicy.project(entry(metadata))
            assertEquals("Initialization failed", result.message)
            assertNull(result.metadata)
        }
        assertEquals("", DiagnosticPolicy.export(emptyList(), "0.1.2", 36))
        assertTrue(DiagnosticPolicy.export(listOf(entry()), "private-custom-build", 36).startsWith("Ritulaya diagnostics v1 | app=unknown"))
    }

    @Test fun `all current application event pairs retain useful operation context`() {
        val events =
            listOf(
                "app" to "Initialization failed",
                "app" to "Refresh failed",
                "app" to "Sync status refresh failed",
                "widget" to "Refresh failed",
                "notifications" to "Reminder scheduling failed",
                "sync:device-flow" to "GitHub device flow failed",
                "sync:repo" to "Failed to create repository",
                "sync:repo" to "Failed to configure repository",
                "sync:status" to "Sync failed",
            )
        for ((tag, message) in events) {
            val result = DiagnosticPolicy.project(entry().copy(tag = tag, message = message))
            assertEquals(tag, result.tag)
            assertEquals(message, result.message)
        }
    }
}
