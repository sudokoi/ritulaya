/* eslint-env node */
const { withAndroidManifest, AndroidConfig } = require("expo/config-plugins")

/** Keystore-bound storage must not travel independently of its device key. */
module.exports = function withRitulayaBackup(config) {
  return withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      config.modResults,
    )
    application.$["android:allowBackup"] = "false"
    application.$["android:fullBackupContent"] = "@xml/ritulaya_backup_rules"
    application.$["android:dataExtractionRules"] = "@xml/ritulaya_extraction_rules"
    return config
  })
}
