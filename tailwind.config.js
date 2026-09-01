/**
 * Theme tokens ported from the original static dashboard (legacy-static/styles.css).
 * These are the only bits a consuming project typically needs to re-brand: swap the
 * primary/accent scales and darkbg/darksurface tokens to theme the whole admin panel.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      colors: {
        primary: {
          50: "#eef2f8",
          100: "#d7e0ee",
          200: "#b0c1dd",
          300: "#88a2cc",
          400: "#4f6ea3",
          500: "#1c3b6a",
          600: "#17335c",
          700: "#142c4d",
          800: "#0f213a",
          900: "#0a1626",
        },
        accent: {
          50: "#fdf8ec",
          100: "#faedc9",
          200: "#f5db93",
          300: "#edc65d",
          400: "#dfb03a",
          500: "#d19d22",
          600: "#ab7d1a",
          700: "#855f15",
          800: "#5e430f",
          900: "#3d2b09",
        },
        darkbg: "#0b1220",
        darksurface: "#121a2e",
        darksurface2: "#182142",
        success: "#16a34a",
        warning: "#d97706",
        error: "#dc2626",
        info: "#2563eb",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "16px",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(16,35,61,.04), 0 1px 6px -1px rgba(16,35,61,.06)",
        popover: "0 12px 32px -8px rgba(9,20,39,.25)",
      },
    },
  },
  plugins: [],
};
