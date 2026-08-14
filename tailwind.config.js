/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        menstrual: "#C17B9D",
        follicular: "#7BA891",
        ovulation: "#C9A96E",
        luteal: "#9B8EC4",
        surface: {
          light: "#FAF8F5",
          dark: "#1A1A1C",
        },
        muted: "#8E8C8A",
        border: {
          light: "#E8E4DF",
          dark: "#3A3835",
        },
      },
      borderRadius: {
        card: "20px",
        button: "14px",
        pill: "999px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
