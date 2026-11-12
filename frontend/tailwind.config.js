/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#082f49',
        },
        watch: {
          bg: '#ecfdf5',
          border: '#10b981',
          text: '#065f46'
        },
        review: {
          bg: '#fffbeb',
          border: '#f59e0b',
          text: '#92400e'
        },
        urgent: {
          bg: '#fef2f2',
          border: '#ef4444',
          text: '#991b1b'
        },
        sensor: {
          bg: '#f5f3ff',
          border: '#8b5cf6',
          text: '#5b21b6'
        }
      }
    },
  },
  plugins: [],
}
