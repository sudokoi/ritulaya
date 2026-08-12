package expo.modules.ritulayalogger

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query

@Dao
interface LogDao {
    @Insert
    suspend fun insert(entry: LogEntry)

    @Query("SELECT * FROM logs ORDER BY timestamp DESC LIMIT :count")
    suspend fun getRecent(count: Int): List<LogEntry>

    @Query("SELECT COUNT(*) FROM logs")
    suspend fun count(): Int

    @Query("DELETE FROM logs WHERE id NOT IN (SELECT id FROM logs ORDER BY timestamp DESC LIMIT :keep)")
    suspend fun prune(keep: Int)

    @Query("DELETE FROM logs")
    suspend fun clearAll()
}
