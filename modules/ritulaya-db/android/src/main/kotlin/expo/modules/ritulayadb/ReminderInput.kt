package expo.modules.ritulayadb

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class ReminderInput : Record {
    @Field var kind: String = ""

    @Field var discreet: Boolean = false

    @Field var language: String = ""

    @Field var daysAhead: Int = 0

    @Field var title: String = ""

    @Field var body: String = ""

    @Field var channelId: String = ""

    @Field var timestamp: Double = 0.0
}
