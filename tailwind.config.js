/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-semantic-primary-normal)",
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
        elevated: "var(--color-semantic-background-elevated-normal)"
      }
    }
  },
  plugins: []
};
