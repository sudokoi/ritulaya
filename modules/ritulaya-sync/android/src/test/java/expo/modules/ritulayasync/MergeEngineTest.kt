package expo.modules.ritulayasync

import com.google.common.truth.Truth.assertThat
import expo.modules.ritulayasync.CsvHandler.CycleRow
import org.junit.Test

class MergeEngineTest {
    private fun cycle(
        id: String,
        updatedAt: String,
        deletedAt: String? = null,
    ): CycleRow =
        CycleRow(
            id = id,
            startDate = "2026-01-01",
            endDate = "2026-01-28",
            createdAt = "2026-01-01T00:00:00.000Z",
            updatedAt = updatedAt,
            deletedAt = deletedAt,
        )

    @Test
    fun `remote deletion removes the row`() {
        val local = listOf(cycle("a", "2026-01-01T00:00:00.000Z"))
        val remote = listOf(cycle("a", "2026-01-01T00:00:00.000Z", deletedAt = "2026-02-01T00:00:00.000Z"))

        assertThat(MergeEngine.mergeCycles(local, remote)).isEmpty()
    }

    @Test
    fun `newer updatedAt wins`() {
        val local = listOf(cycle("a", "2026-01-01T00:00:00.000Z"))
        val remote = listOf(cycle("a", "2026-02-01T00:00:00.000Z"))

        val merged = MergeEngine.mergeCycles(local, remote)

        assertThat(merged).hasSize(1)
        assertThat(merged[0].updatedAt).isEqualTo("2026-02-01T00:00:00.000Z")
    }

    @Test
    fun `remote-only live row is added`() {
        val merged = MergeEngine.mergeCycles(emptyList(), listOf(cycle("a", "2026-01-01T00:00:00.000Z")))

        assertThat(merged).hasSize(1)
        assertThat(merged[0].id).isEqualTo("a")
    }

    @Test
    fun `local tombstone beats remote live row`() {
        val local = listOf(cycle("a", "2026-01-01T00:00:00.000Z", deletedAt = "2026-03-01T00:00:00.000Z"))
        val remote = listOf(cycle("a", "2026-02-01T00:00:00.000Z"))

        val merged = MergeEngine.mergeCycles(local, remote)

        assertThat(merged).hasSize(1)
        assertThat(merged[0].deletedAt).isEqualTo("2026-03-01T00:00:00.000Z")
    }

    @Test
    fun `local-only row survives`() {
        val merged = MergeEngine.mergeCycles(listOf(cycle("a", "2026-01-01T00:00:00.000Z")), emptyList())

        assertThat(merged).hasSize(1)
        assertThat(merged[0].id).isEqualTo("a")
    }
}
