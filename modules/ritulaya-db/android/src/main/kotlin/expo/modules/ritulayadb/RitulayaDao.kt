package expo.modules.ritulayadb

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface RitulayaDao {
    @Query("SELECT * FROM cycles ORDER BY start_date DESC")
    suspend fun listCycles(): List<CycleEntity>

    @Query("SELECT * FROM cycles WHERE id = :id")
    suspend fun getCycleById(id: String): CycleEntity?

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

    @Query("SELECT * FROM day_logs WHERE id = :id")
    suspend fun getDayLogById(id: String): DayLogEntity?

    @Query("SELECT MAX(updated_at) FROM cycles")
    suspend fun latestCycleUpdate(): String?

    @Query("SELECT MAX(updated_at) FROM day_logs")
    suspend fun latestDayLogUpdate(): String?

    @Query(
        "SELECT date FROM day_logs WHERE flow_intensity IS NOT NULL AND flow_intensity != 'none' " +
            "AND date < :date ORDER BY date DESC LIMIT 1",
    )
    suspend fun findFlowDateBefore(date: String): String?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertDayLog(log: DayLogEntity)

    @Query("DELETE FROM day_logs WHERE id = :id")
    suspend fun deleteDayLogById(id: String)

    @Query(
        "SELECT id, avg_cycle_length, avg_period_length, luteal_phase_length, theme, language, COALESCE((SELECT biometricLock FROM device_policy WHERE id = 'default'), 0) AS biometric_lock, discreet_mode, reminder_period_ahead, reminder_daily_log, created_at, updated_at FROM settings WHERE id = 'default' LIMIT 1",
    )
    suspend fun getSettings(): SettingsEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertSettings(settings: SettingsEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertDevicePolicy(policy: DevicePolicyEntity)

    @Query("SELECT * FROM sync_revisions")
    suspend fun syncRevisions(): List<SyncRevisionEntity>

    @Query("SELECT * FROM sync_checkpoints WHERE target = :target")
    suspend fun syncCheckpoint(target: String): SyncCheckpointEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveSyncCheckpoint(checkpoint: SyncCheckpointEntity)

    @Query("UPDATE sync_revisions SET pending = 0 WHERE `key` = :key AND revision = :revision")
    suspend fun acknowledgeRevision(
        key: String,
        revision: Long,
    )

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTombstone(tombstone: SyncTombstoneEntity)

    @Query("SELECT * FROM sync_tombstones")
    suspend fun listTombstones(): List<SyncTombstoneEntity>

    @Query("DELETE FROM cycles")
    suspend fun deleteAllCycles()

    @Query("DELETE FROM cycles WHERE id = :id")
    suspend fun deleteCycleById(id: String)

    @Query("DELETE FROM day_logs")
    suspend fun deleteAllDayLogs()
}
