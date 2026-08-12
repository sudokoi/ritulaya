package expo.modules.ritulayalogger

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query

@Dao
interface LogDao {
    @Insert
    suspend fun insert(log: LogEntity)

    @Query("SELECT * FROM logs ORDER BY id DESC LIMIT :count")
    suspend fun getRecent(count: Int): List<LogEntity>

    @Query("SELECT COUNT(*) FROM logs")
    suspend fun count(): Int

    @Query("DELETE FROM logs WHERE id NOT IN (SELECT id FROM logs ORDER BY id DESC LIMIT :keepCount)")
    suspend fun prune(keepCount: Int)

    @Query("DELETE FROM logs")
    suspend fun clearAll()
}
