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

    /**
     * Max updated_at across the cycles and day logs the prediction was
     * computed from. The widget compares it against the live database to
     * detect a snapshot left stale by writes made outside the app.
     */
    @Field var dataVersion: String = ""
}

/**
 * Localized widget copy captured from JS at compute time so the widget never
 * needs its own translation table. Templates carry a %d placeholder that the
 * widget fills at render time.
 */
class WidgetCopyRecord : Record {
    @Field var menstrual: String = ""

    @Field var follicular: String = ""

    @Field var ovulation: String = ""

    @Field var luteal: String = ""

    @Field var today: String = ""

    @Field var dayUntilSingular: String = ""

    @Field var daysUntilMany: String = ""
}
