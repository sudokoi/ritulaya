package expo.modules.ritulayalogger

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(entities = [LogEntity::class], version = 1, exportSchema = true)
abstract class LogDatabase : RoomDatabase() {
    abstract fun logDao(): LogDao

    companion object {
        private const val MAX_ENTRIES = 1000
        private const val DATABASE_NAME = "ritulaya_logs.db"

        @Volatile
        private var instance: LogDatabase? = null

        fun getInstance(context: Context): LogDatabase =
            instance ?: synchronized(this) {
                instance ?: Room
                    .databaseBuilder(context.applicationContext, LogDatabase::class.java, DATABASE_NAME)
                    .fallbackToDestructiveMigration()
                    .build()
                    .also { instance = it }
            }

        fun getMaxEntries() = MAX_ENTRIES
    }
}
