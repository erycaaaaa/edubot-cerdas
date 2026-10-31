/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#FFFFFF',
        'card-soft': '#FDF6EE',
        brand: {
          DEFAULT: '#B9895F',
          hover: '#A67950',
          light: '#F7EFE6',
        },
        olive: {
          DEFAULT: '#776938',
          hover: '#66592F',
          light: '#F1EEDB',
        },
        txt: {
          main: '#332F2D',
          secondary: '#5D594C',
          muted: '#BDB2A0',
        },
      },
    },
  },
  plugins: [],
}