/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#8b9af9', // Lighter, more pastel main color
          600: '#6366f1',
          700: '#4f46e5',
          800: '#4338ca',
          900: '#3730a3',
        }
      }
    },
  },
  plugins: [],
}
