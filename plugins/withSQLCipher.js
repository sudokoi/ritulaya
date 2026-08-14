/* eslint-env node */
const { withGradleProperties } = require("@expo/config-plugins")

function withSQLCipher(config) {
  return withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter(
      (item) => !(item.type === "property" && item.key === "expo.sqlite.useSQLCipher"),
    )
    config.modResults.push({
      type: "property",
      key: "expo.sqlite.useSQLCipher",
      value: "true",
    })
    return config
  })
}

module.exports = withSQLCipher
