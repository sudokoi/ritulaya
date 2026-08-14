package expo.modules.ritulayadb

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(tableName = "day_logs", indices = [Index(value = ["date"], unique = true)])
data class DayLogEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "date") val date: String,
    @ColumnInfo(name = "cycle_id") val cycleId: String?,
    @ColumnInfo(name = "flow_intensity") val flowIntensity: String?,
    @ColumnInfo(name = "symptoms", defaultValue = "[]") val symptoms: String,
    @ColumnInfo(name = "mood") val mood: String?,
    @ColumnInfo(name = "notes") val notes: String?,
    @ColumnInfo(name = "cervical_mucus") val cervicalMucus: String?,
    @ColumnInfo(name = "bbt") val bbt: Double?,
    @ColumnInfo(name = "sexual_activity", defaultValue = "0") val sexualActivity: Int,
    @ColumnInfo(name = "created_at") val createdAt: String,
    @ColumnInfo(name = "updated_at") val updatedAt: String,
)
