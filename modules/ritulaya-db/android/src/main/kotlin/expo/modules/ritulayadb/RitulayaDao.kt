package expo.modules.ritulayadb

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface RitulayaDao {
    @Query("SELECT * FROM cycles ORDER BY start_date DESC")
    suspend fun listCycles(): List<CycleEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCycle(cycle: CycleEntity)

    @Query("UPDATE cycles SET end_date = :endDate, updated_at = :updatedAt WHERE id = :id")
    suspend fun updateCycleEndDate(
        id: String,
        endDate: String,
        updatedAt: String,
    )

    @Query("SELECT * FROM day_logs ORDER BY date DESC")
    suspend fun listDayLogs(): List<DayLogEntity>

    @Query("SELECT * FROM day_logs WHERE date = :date LIMIT 1")
    suspend fun getDayLogByDate(date: String): DayLogEntity?

    @Query(
        "SELECT date FROM day_logs WHERE flow_intensity IS NOT NULL AND flow_intensity != 'none' " +
            "AND date < :date ORDER BY date DESC LIMIT 1",
    )
    suspend fun findFlowDateBefore(date: String): String?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertDayLog(log: DayLogEntity)

    @Query("DELETE FROM day_logs WHERE id = :id")
    suspend fun deleteDayLogById(id: String)

    @Query("SELECT * FROM settings WHERE id = 'default' LIMIT 1")
    suspend fun getSettings(): SettingsEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertSettings(settings: SettingsEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTombstone(tombstone: SyncTombstoneEntity)

    @Query("SELECT * FROM sync_tombstones")
    suspend fun listTombstones(): List<SyncTombstoneEntity>

    @Query("DELETE FROM sync_tombstones")
    suspend fun clearTombstones()

    @Query("DELETE FROM cycles")
    suspend fun deleteAllCycles()

    @Query("DELETE FROM day_logs")
    suspend fun deleteAllDayLogs()
}
