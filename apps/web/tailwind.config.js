/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#fff7f8",
          100: "#ffe2e8",
          200: "#ffc8d5",
          300: "#fda8bd",
          400: "#f58ca3",
          500: "#f2718e",
          600: "#e55a7b",
        },
      },
      borderRadius: {
        xl: "1rem",
        '2xl': "1.25rem",
      },
    },
  },
  plugins: [],
}
