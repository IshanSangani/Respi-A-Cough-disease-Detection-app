/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './hooks/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}'
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef7ff',
          100: '#d9ecff',
          200: '#b8deff',
          300: '#89c9ff',
          400: '#51abff',
          500: '#1e8cff',
          600: '#0d6ee6',
          700: '#0553b4',
          800: '#033b7d',
          900: '#012548'
        },
        secondary: {
          500: '#4b9bd6',
          600: '#337fb8'
        },
        danger: {
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c'
        }
      }
    }
  },
  plugins: []
};