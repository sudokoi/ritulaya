/* eslint-env node */
const { withAndroidManifest } = require("@expo/config-plugins")

function withRitulayaWidget(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest

    if (!Array.isArray(manifest.application)) {
      manifest.application = [manifest.application]
    }

    manifest.application[0].receiver = manifest.application[0].receiver || []
    const receivers = manifest.application[0].receiver

    const hasWidget = receivers.some(
      (r) => r.$["android:name"] === "expo.modules.ritulayawidget.RitulayaWidgetProvider",
    )

    if (!hasWidget) {
      receivers.push({
        $: {
          "android:name": "expo.modules.ritulayawidget.RitulayaWidgetProvider",
          "android:exported": "false",
        },
        "intent-filter": [
          {
            action: [
              {
                $: {
                  "android:name": "android.appwidget.action.APPWIDGET_UPDATE",
                },
              },
            ],
          },
        ],
        "meta-data": [
          {
            $: {
              "android:name": "android.appwidget.provider",
              "android:resource": "@xml/ritulaya_widget_info",
            },
          },
        ],
      })
    }

    return config
  })
}

module.exports = withRitulayaWidget
