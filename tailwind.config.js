/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3A86FF',
        secondary: '#00F5D4',
        accent: '#FF006E',
        dark: '#2D3748',
        light: '#F7FAFC',
      },
    },
  },
  plugins: [],
} 