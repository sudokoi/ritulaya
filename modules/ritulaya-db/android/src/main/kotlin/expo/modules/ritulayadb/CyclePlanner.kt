package expo.modules.ritulayadb

import java.time.LocalDate
import java.time.temporal.ChronoUnit

/**
 * Pure, order-independent placement of a new period into the cycle timeline.
 *
 * Cycle boundaries are derived from the recorded flow dates rather than the
 * order in which entries were made, so a backdated entry produces the same
 * structure it would have if the app had been used at that past date. This
 * keeps the data deterministic and safe to round-trip through sync.
 */
object CyclePlanner {
    const val NEW_CYCLE_GAP_DAYS = 7

    sealed interface Placement {
        /** The new period continues the existing cycle that starts on [cycleStartDate]. */
        data class Extend(
            val cycleStartDate: String,
        ) : Placement

        /**
         * The new period starts a new cycle. The predecessor (if any) must be
         * closed the day before it, and the successor (if any) bounds the new
         * cycle so it stays a completed cycle rather than the open one.
         */
        data class New(
            val predecessorStartDate: String?,
            val successorStartDate: String?,
        ) : Placement
    }

    /**
     * @param existingStartDates existing cycle start dates sorted ascending
     * @param newStart the new period's first day (yyyy-MM-dd)
     * @param prevFlowDate the most recent flow date before [newStart], or null
     */
    fun place(
        existingStartDates: List<String>,
        newStart: String,
        prevFlowDate: String?,
    ): Placement {
        existingStartDates.firstOrNull { it == newStart }?.let {
            return Placement.Extend(it)
        }

        if (prevFlowDate != null) {
            val gap =
                ChronoUnit.DAYS.between(
                    LocalDate.parse(prevFlowDate),
                    LocalDate.parse(newStart),
                )
            if (gap in 0 until NEW_CYCLE_GAP_DAYS) {
                val owningStart =
                    existingStartDates.lastOrNull {
                        !LocalDate.parse(it).isAfter(LocalDate.parse(prevFlowDate))
                    }
                if (owningStart != null) return Placement.Extend(owningStart)
            }
        }

        val start = LocalDate.parse(newStart)
        val predecessor = existingStartDates.lastOrNull { LocalDate.parse(it).isBefore(start) }
        val successor = existingStartDates.firstOrNull { LocalDate.parse(it).isAfter(start) }
        return Placement.New(predecessor, successor)
    }
}
