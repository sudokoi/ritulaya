package expo.modules.ritulayalogger

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "logs")
data class LogEntry(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val level: String,
    val tag: String,
    val message: String,
    val metadata: String? = null,
    val timestamp: Long = System.currentTimeMillis(),
)
