package expo.modules.ritulayasync

import android.util.Base64

object FieldCodec {
    fun encode(value: String): String = Base64.encodeToString(value.toByteArray(Charsets.UTF_8), Base64.NO_WRAP)

    fun decode(value: String): String =
        try {
            String(Base64.decode(value, Base64.DEFAULT), Charsets.UTF_8)
        } catch (e: Exception) {
            value
        }
}
