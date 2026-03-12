/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'austin-blue': '#003f5c',
        'austin-orange': '#ff6b35',
        'austin-green': '#58a55c',
        'austin-purple': '#7209b7'
      }
    },
  },
  plugins: [],
}