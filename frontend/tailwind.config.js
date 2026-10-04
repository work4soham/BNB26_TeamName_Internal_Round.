/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        burgundy: {
          50: '#FDF2F4',
          100: '#FBE8EC',
          200: '#F7D0D8',
          300: '#EFA6B7',
          400: '#E2738E',
          500: '#CE4568',
          600: '#B0264A',
          700: '#800020',
          800: '#6B0F24',
          900: '#4A0A19',
          950: '#2E050F',
        },
        brand: {
          50: '#FDF2F4',
          100: '#FBE8EC',
          200: '#F7D0D8',
          300: '#EFA6B7',
          400: '#E2738E',
          500: '#CE4568',
          600: '#B0264A',
          700: '#800020',
          800: '#6B0F24',
          900: '#4A0A19',
          950: '#2E050F',
        },
        accent: {
          amber: '#D97706',
          emerald: '#059669',
          rose: '#E11D48',
          sky: '#0284C7'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
