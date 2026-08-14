package expo.modules.ritulayadb

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import expo.modules.kotlin.records.Required

class DayLogInput : Record {
    @Field @Required
    var date: String = ""

    @Field var cycleId: String? = null

    @Field var flowIntensity: String? = null

    @Field var symptoms: List<String>? = null

    @Field var mood: String? = null

    @Field var notes: String? = null

    @Field var cervicalMucus: String? = null

    @Field var bbt: Double? = null

    @Field var sexualActivity: Boolean? = null
}

class SettingsPatch : Record {
    @Field var avgCycleLength: Int? = null

    @Field var avgPeriodLength: Int? = null

    @Field var lutealPhaseLength: Int? = null

    @Field var theme: String? = null

    @Field var language: String? = null

    @Field var biometricLock: Int? = null

    @Field var discreetMode: Int? = null

    @Field var reminderPeriodAhead: Int? = null

    @Field var reminderDailyLog: Int? = null

    @Field var createdAt: String? = null
}
