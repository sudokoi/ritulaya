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
