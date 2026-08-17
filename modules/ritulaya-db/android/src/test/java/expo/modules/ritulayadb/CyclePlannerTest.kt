package expo.modules.ritulayadb

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class CyclePlannerTest {
    @Test
    fun `first period starts a new cycle`() {
        val placement = CyclePlanner.place(emptyList(), "2026-03-01", prevFlowDate = null)

        assertThat(placement).isEqualTo(CyclePlanner.Placement.New(null, null))
    }

    @Test
    fun `period within gap extends the previous cycle`() {
        val placement =
            CyclePlanner.place(
                listOf("2026-03-01"),
                newStart = "2026-03-03",
                prevFlowDate = "2026-03-01",
            )

        assertThat(placement).isEqualTo(CyclePlanner.Placement.Extend("2026-03-01"))
    }

    @Test
    fun `period after the gap starts a new cycle and closes the predecessor`() {
        val placement =
            CyclePlanner.place(
                listOf("2026-03-01"),
                newStart = "2026-03-29",
                prevFlowDate = "2026-03-03",
            )

        assertThat(placement)
            .isEqualTo(CyclePlanner.Placement.New(predecessorStartDate = "2026-03-01", successorStartDate = null))
    }

    @Test
    fun `backdated period before all cycles bounds the new cycle by the successor`() {
        val placement =
            CyclePlanner.place(
                listOf("2026-03-29"),
                newStart = "2026-03-01",
                prevFlowDate = null,
            )

        assertThat(placement)
            .isEqualTo(CyclePlanner.Placement.New(predecessorStartDate = null, successorStartDate = "2026-03-29"))
    }

    @Test
    fun `backdated period between two cycles closes both neighbors`() {
        val placement =
            CyclePlanner.place(
                listOf("2026-03-01", "2026-03-29"),
                newStart = "2026-03-15",
                prevFlowDate = "2026-03-03",
            )

        assertThat(placement)
            .isEqualTo(
                CyclePlanner.Placement.New(
                    predecessorStartDate = "2026-03-01",
                    successorStartDate = "2026-03-29",
                ),
            )
    }

    @Test
    fun `re-logging an existing cycle start extends instead of duplicating`() {
        val placement =
            CyclePlanner.place(
                listOf("2026-03-01"),
                newStart = "2026-03-01",
                prevFlowDate = "2026-02-20",
            )

        assertThat(placement).isEqualTo(CyclePlanner.Placement.Extend("2026-03-01"))
    }

    @Test
    fun `backdated period far before the latest cycle never yields a negative gap`() {
        // Latest cycle has been cleared of flow days, so prevFlowDate is old.
        val placement =
            CyclePlanner.place(
                listOf("2026-01-01", "2026-02-15"),
                newStart = "2026-01-20",
                prevFlowDate = "2026-01-03",
            )

        // It starts a new cycle between the two, closing the predecessor (Jan 1)
        // and bounding against the successor (Feb 15) rather than corrupting it.
        assertThat(placement)
            .isEqualTo(
                CyclePlanner.Placement.New(
                    predecessorStartDate = "2026-01-01",
                    successorStartDate = "2026-02-15",
                ),
            )
    }
}
