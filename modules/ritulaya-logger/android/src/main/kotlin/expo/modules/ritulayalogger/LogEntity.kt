package expo.modules.ritulayalogger

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(tableName = "logs", indices = [Index(value = ["level"])])
data class LogEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val timestamp: Long,
    val level: String,
    val tag: String,
    val message: String,
    val metadata: String? = null,
)
