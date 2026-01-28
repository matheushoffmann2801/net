/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Garantindo que as cores do Dashboard existam
        slate: {
          50: '#f8fafc',
          900: '#0f172a',
        }
      }
    },
  },
  plugins: [],
}