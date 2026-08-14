package expo.modules.ritulayacrypto

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Key management lives in [CryptoKeys] and is consumed directly by
 * `ritulaya-db` in Kotlin. This module is kept only so autolinking exposes
 * `:ritulaya-crypto` as a Gradle project; it exposes no JS surface.
 */
class RitulayaCryptoModule : Module() {
    override fun definition() =
        ModuleDefinition {
            Name("RitulayaCrypto")
        }
}
