/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#9E7FFF', // Soft Purple
        secondary: '#38bdf8', // Bright Blue
        accent: '#f472b6', // Soft Pink (used sparingly for highlights)
        background: '#171717', // Very Dark Grey
        surface: '#262626', // Dark Grey for cards/panels
        text: '#FFFFFF', // White for main text
        textSecondary: '#A3A3A3', // Medium Grey for secondary text
        border: '#2F2F2F', // Darker Grey for borders
        success: '#10b981', // Green
        warning: '#f59e0b', // Orange
        error: '#ef4444', // Red
      },
    },
  },
  plugins: [],
};
