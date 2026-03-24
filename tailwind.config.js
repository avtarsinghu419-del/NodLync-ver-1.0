/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,jsx,js}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        panel: "rgb(var(--panel) / <alpha-value>)",
        stroke: "rgb(var(--border) / <alpha-value>)",
        "stroke-strong": "rgb(var(--border-strong) / <alpha-value>)",
        fg: "rgb(var(--text-primary) / <alpha-value>)",
        "fg-secondary": "rgb(var(--text-secondary) / <alpha-value>)",
        "fg-muted": "rgb(var(--text-muted) / <alpha-value>)",
        input: "rgb(var(--input-bg) / <alpha-value>)",
        "input-stroke": "rgb(var(--input-border) / <alpha-value>)",
        primary: "#38bdf8",
        accent: "#8b5cf6",
        "on-primary": "#0b1220",
      },
    },
  },
  plugins: [],
};
