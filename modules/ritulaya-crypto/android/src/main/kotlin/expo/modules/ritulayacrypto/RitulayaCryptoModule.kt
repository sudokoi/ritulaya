package expo.modules.ritulayacrypto

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class RitulayaCryptoModule : Module() {
    override fun definition() =
        ModuleDefinition {
            Name("RitulayaCrypto")

            AsyncFunction("generateKey") {
                CryptoKeys.generateKey()
            }

            AsyncFunction("encrypt") { plaintext: String ->
                CryptoKeys.encrypt(plaintext)
            }

            AsyncFunction("decrypt") { ciphertext: String ->
                CryptoKeys.decrypt(ciphertext)
            }

            Function("getDatabaseKey") {
                val context =
                    appContext.reactContext?.applicationContext
                        ?: throw IllegalStateException("Context not available")
                CryptoKeys.getDatabaseKey(context)
            }
        }
}
