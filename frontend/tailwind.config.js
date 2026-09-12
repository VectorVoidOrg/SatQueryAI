/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["'Instrument Serif'", "serif"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      colors: {
        base: "rgb(var(--color-base) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        primary: "rgb(var(--color-primary) / <alpha-value>)",
        secondary: "rgb(var(--color-secondary) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        dark: {
          base: "#0F0E0C",
          surface: "#171512",
          elevated: "#1F1B17",
          card: "#171512",
          border: "rgba(255, 255, 255, 0.10)",
          primary: "#F3EEE7",
          secondary: "#B8AEA3",
          muted: "#91877D",
        },
        accent: {
          DEFAULT: "#C86D3B",
          hover: "#D97736",
        },
        ochre: {
          DEFAULT: "#C86D3B",
          light: "rgba(200, 109, 59, 0.18)",
        },
        sand: {
          50: "#FAF6F0",
          100: "#F3E5D0",
          200: "#EADCC9",
          300: "#DFCDB5",
        },
        evidence: {
          DEFAULT: "#C86D3B",
          fill: "rgba(200, 109, 59, 0.22)",
        },
        success: "#059669",
        error: "#E11D48",
      },
      transitionTimingFunction: {
        apple: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      borderRadius: {
        panel: "16px",
        input: "9999px",
        badge: "9999px",
      },
      boxShadow: {
        glass: "0 12px 36px rgba(78, 59, 42, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 0.6)",
        subtle: "0 2px 8px rgba(78, 59, 42, 0.06)",
        glow: "0 0 24px rgba(200, 109, 59, 0.25)",
      },
      keyframes: {
        "pulse-evidence": {
          "0%, 100%": { strokeWidth: "2px" },
          "50%": { strokeWidth: "4.5px" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "dot-pulse": {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "pulse-evidence": "pulse-evidence 0.8s ease-in-out infinite",
        "fade-in-up": "fade-in-up 200ms ease-out forwards",
        "dot-pulse-1": "dot-pulse 1.2s infinite ease-in-out",
        "dot-pulse-2": "dot-pulse 1.2s infinite ease-in-out 150ms",
        "dot-pulse-3": "dot-pulse 1.2s infinite ease-in-out 300ms",
      },
    },
  },
  plugins: [],
};