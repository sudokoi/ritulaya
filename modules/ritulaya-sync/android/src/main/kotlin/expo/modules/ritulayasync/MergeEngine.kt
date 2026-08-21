package expo.modules.ritulayasync

import expo.modules.ritulayasync.CsvHandler.CycleRow
import expo.modules.ritulayasync.CsvHandler.DayLogRow

object MergeEngine {
    fun mergeCycles(
        local: List<CycleRow>,
        remote: List<CycleRow>,
    ): List<CycleRow> {
        val merged = mutableMapOf<String, CycleRow>()
        local.forEach { merged[it.id] = it }
        remote.forEach { remoteRow ->
            val localRow = merged[remoteRow.id]
            if (localRow == null) {
                if (remoteRow.deletedAt == null) merged[remoteRow.id] = remoteRow
            } else if (remoteRow.deletedAt != null) {
                if (localRow.deletedAt != null) {
                    merged.remove(remoteRow.id)
                } else if (parseIso(remoteRow.deletedAt) >= parseIso(localRow.updatedAt)) {
                    merged.remove(remoteRow.id)
                }
            } else if (localRow.deletedAt != null) {
                merged[remoteRow.id] = localRow
            } else {
                merged[remoteRow.id] = resolveConflict(localRow, remoteRow)
            }
        }
        return merged.values.toList()
    }

    fun mergeDayLogs(
        local: List<DayLogRow>,
        remote: List<DayLogRow>,
    ): List<DayLogRow> {
        val merged = mutableMapOf<String, DayLogRow>()
        local.forEach { merged[it.id] = it }
        remote.forEach { remoteRow ->
            val localRow = merged[remoteRow.id]
            if (localRow == null) {
                if (remoteRow.deletedAt == null) merged[remoteRow.id] = remoteRow
            } else if (remoteRow.deletedAt != null) {
                if (localRow.deletedAt != null) {
                    merged.remove(remoteRow.id)
                } else if (parseIso(remoteRow.deletedAt) >= parseIso(localRow.updatedAt)) {
                    merged.remove(remoteRow.id)
                }
            } else if (localRow.deletedAt != null) {
                merged[remoteRow.id] = localRow
            } else {
                merged[remoteRow.id] = resolveConflict(localRow, remoteRow)
            }
        }
        return merged.values.toList()
    }

    private fun resolveConflict(
        local: CycleRow,
        remote: CycleRow,
    ): CycleRow {
        val localTime = parseIso(local.updatedAt)
        val remoteTime = parseIso(remote.updatedAt)
        return if (remoteTime >= localTime) remote else local
    }

    private fun resolveConflict(
        local: DayLogRow,
        remote: DayLogRow,
    ): DayLogRow {
        val localTime = parseIso(local.updatedAt)
        val remoteTime = parseIso(remote.updatedAt)
        return if (remoteTime >= localTime) remote else local
    }

    private fun parseIso(timestamp: String): Long =
        try {
            java.time.Instant
                .parse(timestamp)
                .toEpochMilli()
        } catch (e: Exception) {
            Long.MIN_VALUE
        }
}
