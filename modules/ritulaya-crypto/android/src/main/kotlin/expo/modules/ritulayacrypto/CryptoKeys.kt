package expo.modules.ritulayacrypto

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

object CryptoKeys {
    private const val KEY_ALIAS = "ritulaya_master_key"
    private const val PREFS = "ritulaya_crypto"
    private const val DB_KEY_PREF = "db_key"
    private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    private const val TRANSFORMATION = "AES/GCM/NoPadding"
    private const val GCM_TAG_LENGTH = 128

    fun getDatabaseKey(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        prefs.getString(DB_KEY_PREF, null)?.let { return decrypt(it) }

        val raw = ByteArray(32).also { SecureRandom().nextBytes(it) }
        val hex = raw.joinToString("") { "%02x".format(it) }
        prefs.edit().putString(DB_KEY_PREF, encrypt(hex)).apply()
        return hex
    }

    fun generateKey() {
        ensureKeyExists()
    }

    fun encrypt(plaintext: String): String {
        val key = ensureKeyExists()
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, key)

        val iv = cipher.iv
        val encrypted = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))

        val combined = ByteArray(iv.size + encrypted.size)
        System.arraycopy(iv, 0, combined, 0, iv.size)
        System.arraycopy(encrypted, 0, combined, iv.size, encrypted.size)

        return Base64.encodeToString(combined, Base64.NO_WRAP)
    }

    fun decrypt(encoded: String): String {
        val key = ensureKeyExists()
        val combined = Base64.decode(encoded, Base64.NO_WRAP)

        val cipher = Cipher.getInstance(TRANSFORMATION)
        val spec = GCMParameterSpec(GCM_TAG_LENGTH, combined, 0, 12)
        cipher.init(Cipher.DECRYPT_MODE, key, spec)

        val decrypted = cipher.doFinal(combined, 12, combined.size - 12)
        return String(decrypted, Charsets.UTF_8)
    }

    private fun ensureKeyExists(): SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
        keyStore.load(null)

        if (keyStore.containsAlias(KEY_ALIAS)) {
            return (keyStore.getEntry(KEY_ALIAS, null) as KeyStore.SecretKeyEntry).secretKey
        }

        val keyGenerator =
            KeyGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_AES,
                ANDROID_KEYSTORE,
            )

        val spec =
            KeyGenParameterSpec
                .Builder(
                    KEY_ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
                ).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()

        keyGenerator.init(spec)
        return keyGenerator.generateKey()
    }
}
