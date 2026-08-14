package expo.modules.ritulayadb

import androidx.room.ColumnInfo
import androidx.room.Entity

@Entity(tableName = "sync_tombstones", primaryKeys = ["entity", "entity_id"])
data class SyncTombstoneEntity(
    @ColumnInfo(name = "entity") val entity: String,
    @ColumnInfo(name = "entity_id") val entityId: String,
    @ColumnInfo(name = "deleted_at") val deletedAt: String,
)
