package expo.modules.ritulayasync

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import java.net.SocketTimeoutException

class SyncRetryTest {
    @Test
    fun `transient failures retry within the attempt limit`() {
        assertThat(shouldRetrySync(SocketTimeoutException(), 0)).isTrue()
        assertThat(shouldRetrySync(GithubHttpException(503), 2)).isTrue()
        assertThat(shouldRetrySync(GithubHttpException(429), 0)).isTrue()
        assertThat(shouldRetrySync(GithubHttpException(409), 0)).isTrue()
        assertThat(shouldRetrySync(SocketTimeoutException(), 3)).isFalse()
    }

    @Test
    fun `authentication and invalid data do not retry`() {
        assertThat(shouldRetrySync(GithubHttpException(401), 0)).isFalse()
        assertThat(shouldRetrySync(GithubHttpException(403), 0)).isFalse()
        assertThat(shouldRetrySync(IllegalArgumentException(), 0)).isFalse()
    }
}
