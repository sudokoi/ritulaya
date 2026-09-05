package expo.modules.ritulayaauth

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthenticationSessionTest {
    @Test
    fun backgroundExpiresSuccessEvenWhenJavascriptHasNotReceivedIt() {
        val session = AuthenticationSession()
        session.enterForeground()
        val request = requireNotNull(session.begin())
        val token = requireNotNull(session.complete(request))
        session.enterBackground()
        session.enterForeground()
        assertFalse(session.isCurrent(token))
    }

    @Test
    fun backgroundInvalidatesAnUnfinishedBiometricCallback() {
        val session = AuthenticationSession()
        session.enterForeground()
        val request = requireNotNull(session.begin())
        session.enterBackground()
        session.enterForeground()
        assertNull(session.complete(request))
    }

    @Test
    fun credentialReturnCanCompleteBeforeOrAfterResume() {
        for (resumeFirst in listOf(false, true)) {
            val session = AuthenticationSession()
            session.enterForeground()
            val request = requireNotNull(session.begin())
            assertTrue(session.awaitCredential(request))
            session.enterBackground()
            if (resumeFirst) session.enterForeground()
            val token = requireNotNull(session.complete(request))
            assertEquals(resumeFirst, session.isCurrent(token))
            session.enterForeground()
            assertTrue(session.isCurrent(token))
            session.enterBackground()
            session.enterForeground()
            assertFalse(session.isCurrent(token))
        }
    }

    @Test
    fun cancelledRequestCannotCompleteOrInvalidateItsReplacement() {
        val session = AuthenticationSession()
        assertNull(session.begin())
        session.enterForeground()
        val first = requireNotNull(session.begin())
        assertNull(session.begin())
        session.awaitCredential(first)
        session.cancel()
        val second = requireNotNull(session.begin())
        assertNull(session.complete(first))
        assertFalse(session.awaitCredential(first))
        assertTrue(session.isCurrent(requireNotNull(session.complete(second))))
    }
}
