package expo.modules.ritulayapredictions

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class CycleInputRecord : Record {
    @Field var id: String = ""

    @Field var startDate: String = ""

    @Field var endDate: String? = null
}

class DayLogInputRecord : Record {
    @Field var date: String = ""

    @Field var cycleId: String? = null

    @Field var flowIntensity: String? = null
}

class PredictionConfigRecord : Record {
    @Field var avgCycleLength: Int = 0

    @Field var avgPeriodLength: Int = 0

    @Field var lutealPhaseLength: Int = 0
}
