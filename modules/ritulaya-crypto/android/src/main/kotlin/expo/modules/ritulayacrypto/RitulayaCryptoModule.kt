package expo.modules.ritulayacrypto

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class RitulayaCryptoModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("RitulayaCrypto")

    AsyncFunction("initDatabase") { path: String ->
      initEncryptedDatabase(path)
    }
  }

  private fun initEncryptedDatabase(path: String): String {
    // TODO: Generate/store 256-bit key in Android Keystore
    // Open SQLCipher database with key
    return path
  }
}
