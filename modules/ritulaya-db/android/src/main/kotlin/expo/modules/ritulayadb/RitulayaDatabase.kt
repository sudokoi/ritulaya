package expo.modules.ritulayadb

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import expo.modules.ritulayacrypto.CryptoKeys
import net.sqlcipher.database.SQLiteDatabase
import net.sqlcipher.database.SupportFactory

@Database(
    entities = [
        CycleEntity::class,
        DayLogEntity::class,
        SettingsEntity::class,
        SyncTombstoneEntity::class,
    ],
    version = 1,
    exportSchema = true,
)
abstract class RitulayaDatabase : RoomDatabase() {
    abstract fun dao(): RitulayaDao

    companion object {
        private const val DATABASE_NAME = "ritulaya.db"

        @Volatile
        private var instance: RitulayaDatabase? = null

        fun getInstance(context: Context): RitulayaDatabase =
            instance ?: synchronized(this) {
                instance ?: build(context.applicationContext).also { instance = it }
            }

        private fun build(context: Context): RitulayaDatabase {
            SQLiteDatabase.loadLibs(context)
            val key = CryptoKeys.getDatabaseKey(context)
            val factory = SupportFactory(key.toByteArray(Charsets.UTF_8))
            return Room
                .databaseBuilder(context, RitulayaDatabase::class.java, DATABASE_NAME)
                .openHelperFactory(factory)
                .build()
        }
    }
}
