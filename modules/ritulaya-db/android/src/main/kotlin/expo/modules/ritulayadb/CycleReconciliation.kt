package expo.modules.ritulayadb

import java.time.LocalDate
import java.time.temporal.ChronoUnit

/** Derived topology only: never changes recorded flow or other tracking values. */
internal object CycleReconciliation {
    private const val NEW_CYCLE_GAP_DAYS = 7

    data class Plan(
        val cycles: List<CycleEntity>,
        val logs: List<DayLogEntity>,
    )

    private fun hasFlow(log: DayLogEntity) = log.flowIntensity != null && log.flowIntensity != "none"

    private fun owners(logs: List<DayLogEntity>): Map<String, String> {
        var previous: String? = null
        var start = ""
        return logs.filter(::hasFlow).sortedBy { it.date }.associate { log ->
            if (previous == null ||
                ChronoUnit.DAYS.between(LocalDate.parse(previous), LocalDate.parse(log.date)) >= NEW_CYCLE_GAP_DAYS
            ) {
                start =
                    log.date
            }
            previous = log.date
            log.date to start
        }
    }

    private fun boundaries(owners: Map<String, String>): Map<String, String?> {
        val starts = owners.values.distinct().sorted()
        return starts
            .mapIndexed {
                index,
                start,
                ->
                start to starts.getOrNull(index + 1)?.let { LocalDate.parse(it).minusDays(1).toString() }
            }.toMap()
    }

    fun plan(
        cycles: List<CycleEntity>,
        before: List<DayLogEntity>,
        after: List<DayLogEntity>,
        repair: Boolean = false,
    ): Plan {
        val oldOwners = owners(before)
        val newOwners = owners(after)
        val oldBounds = boundaries(oldOwners)
        val newBounds = boundaries(newOwners)
        // Only topology changed by this command is automatic. Pre-existing damage
        // elsewhere remains untouched until the separate preview is confirmed.
        val affected =
            if (repair) {
                cycles.map { it.startDate }.toSet() + newBounds.keys
            } else {
                (oldBounds.keys + newBounds.keys)
                    .filter {
                        oldBounds.containsKey(it) != newBounds.containsKey(it) ||
                            oldBounds[it] != newBounds[it]
                    }.toSet()
            }
        val now = RitulayaDataStore.nowISO()
        val kept = cycles.filter { it.startDate !in affected }.toMutableList()
        for (start in affected.sorted()) {
            if (start !in newBounds) continue
            val matches = cycles.filter { it.startDate == start }.sortedBy { it.id }
            require(repair || matches.size <= 1) { "Cycle history needs confirmed repair" }
            val original = matches.firstOrNull()
            kept += original?.let { if (it.endDate == newBounds[start]) it else it.copy(endDate = newBounds[start], updatedAt = now) }
                ?: CycleEntity(RitulayaDataStore.generateId(), start, newBounds[start], now, now)
        }
        val byStart = kept.associateBy { it.startDate }
        val affectedIds = cycles.filter { it.startDate in affected }.map { it.id }.toSet()
        val logs =
            after.map { log ->
                val changedFlow = oldOwners[log.date] != newOwners[log.date]
                if (!repair && !changedFlow && log.cycleId !in affectedIds && newOwners[log.date] !in affected) return@map log
                val owner =
                    if (hasFlow(log)) {
                        byStart[newOwners[log.date]]
                    } else {
                        if (log.cycleId !=
                            null
                        ) {
                            kept
                                .filter {
                                    it.startDate <= log.date && (it.endDate == null || it.endDate >= log.date)
                                }.maxByOrNull { it.startDate }
                        } else {
                            null
                        }
                    }
                if (log.cycleId == owner?.id) log else log.copy(cycleId = owner?.id, updatedAt = now)
            }
        return Plan(kept.sortedBy { it.startDate }, logs)
    }
}
