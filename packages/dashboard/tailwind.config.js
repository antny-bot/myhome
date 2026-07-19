/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--color-semantic-primary-normal)",
          50: "rgb(var(--color-primary-50) / <alpha-value>)",
          100: "rgb(var(--color-primary-100) / <alpha-value>)",
          200: "rgb(var(--color-primary-200) / <alpha-value>)",
          300: "rgb(var(--color-primary-300) / <alpha-value>)",
          400: "rgb(var(--color-primary-400) / <alpha-value>)",
          500: "rgb(var(--color-primary-500) / <alpha-value>)",
          600: "rgb(var(--color-primary-600) / <alpha-value>)",
          700: "rgb(var(--color-primary-700) / <alpha-value>)",
          800: "rgb(var(--color-primary-800) / <alpha-value>)",
          900: "rgb(var(--color-primary-900) / <alpha-value>)",
        },
        ink: "var(--color-semantic-label-strong)",
        line: "var(--color-semantic-line-normal-normal)",
        panel: "var(--color-semantic-background-normal-alternative)",
        signal: "var(--color-semantic-status-positive)",
        warn: "var(--color-semantic-status-negative)",
        strong: "var(--color-semantic-label-strong)",
        neutral: "var(--color-semantic-label-neutral)",
        assistive: "var(--color-semantic-label-assistive)",
        normal: "var(--color-semantic-background-normal-normal)",
        alternative: "var(--color-semantic-background-normal-alternative)",
        elevated: "var(--color-semantic-background-elevated-normal)",
        up: {
          50: '#feecec',
          100: '#fed5d5',
          400: '#ff6363',
          500: '#e52222',
          600: '#b20c0c',
        },
        down: {
          50: '#eaf2fe',
          100: '#c9defe',
          400: '#4f95ff',
          500: '#1666e0',
          600: '#0054d1',
        },
      },
      borderRadius: {
        xl: '1rem',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0,0,0,0.04), 0 1px 1px 0 rgba(23,23,23,0.06)',
      },
    }
  },
  plugins: []
};

