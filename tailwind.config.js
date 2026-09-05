const plugin = require("tailwindcss/plugin")
const tokens = require("./src/constants/theme-tokens.json")

const kebab = (name) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
const variables = (colors) =>
  Object.fromEntries(
    Object.entries(colors).map(([key, value]) => [`--${kebab(key)}`, value]),
  )

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  // The class is selected by NativeWind at runtime, not present in route JSX.
  safelist: ["dark"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ...Object.fromEntries(
          Object.entries(tokens.phase).flatMap(([phase, colors]) => [
            [phase, colors.hex],
            [`${phase}-dark`, colors.darkHex],
          ]),
        ),
        ...Object.fromEntries(
          ["accent", "onAccent", "accentWash"].flatMap((key) => [
            [kebab(key), tokens.color.light[key]],
            [`${kebab(key)}-dark`, tokens.color.dark[key]],
          ]),
        ),
      },
      borderRadius: Object.fromEntries(
        Object.entries(tokens.radius).map(([key, value]) => [key, `${value}px`]),
      ),
      spacing: Object.fromEntries(
        Object.entries(tokens.spacing).map(([key, value]) => [key, `${value}px`]),
      ),
      minHeight: { touch: `${tokens.control.minHeight}px` },
      minWidth: { touch: `${tokens.control.minHeight}px` },
      fontSize: tokens.typography,
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    plugin(({ addBase }) => {
      addBase({
        ":root": variables(tokens.color.light),
        ".dark:root": variables(tokens.color.dark),
      })
    }),
  ],
}
