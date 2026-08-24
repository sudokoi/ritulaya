/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        menstrual: "#A15878",
        "menstrual-dark": "#DFA9C0",
        follicular: "#42725A",
        "follicular-dark": "#A2CCB4",
        ovulation: "#8C6A24",
        "ovulation-dark": "#E4C585",
        luteal: "#67589C",
        "luteal-dark": "#BDA9E2",
        accent: "#0F766E",
        "accent-dark": "#5EEAD4",
        "on-accent": "#ffffff",
        "on-accent-dark": "#0F2E2A",
        "accent-wash": "rgba(15, 118, 110, 0.2)",
        "accent-wash-dark": "rgba(94, 234, 212, 0.2)",
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
