package expo.modules.ritulayadb

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "settings")
data class SettingsEntity(
    @PrimaryKey val id: String = "default",
    @ColumnInfo(name = "avg_cycle_length", defaultValue = "28") val avgCycleLength: Int = 28,
    @ColumnInfo(name = "avg_period_length", defaultValue = "5") val avgPeriodLength: Int = 5,
    @ColumnInfo(name = "luteal_phase_length", defaultValue = "14") val lutealPhaseLength: Int = 14,
    @ColumnInfo(name = "theme", defaultValue = "system") val theme: String = "system",
    @ColumnInfo(name = "language", defaultValue = "en") val language: String = "en",
    @ColumnInfo(name = "biometric_lock", defaultValue = "0") val biometricLock: Int = 0,
    @ColumnInfo(name = "discreet_mode", defaultValue = "0") val discreetMode: Int = 0,
    @ColumnInfo(name = "reminder_period_ahead", defaultValue = "2") val reminderPeriodAhead: Int = 2,
    @ColumnInfo(name = "reminder_daily_log", defaultValue = "0") val reminderDailyLog: Int = 0,
    @ColumnInfo(name = "created_at") val createdAt: String,
    @ColumnInfo(name = "updated_at") val updatedAt: String,
)
