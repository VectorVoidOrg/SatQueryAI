/** @type {import('tailwindcss').Config} */
module.exports = {
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
        base: "#FAFAF9",
        surface: "#FFFFFF",
        primary: "#0F172A",
        secondary: "rgba(15, 23, 42, 0.6)",
        accent: {
          DEFAULT: "#0284C7",
          hover: "#0369A1",
        },
        evidence: {
          DEFAULT: "#F59E0B",
          fill: "rgba(245, 158, 11, 0.25)",
        },
        success: "#16A34A",
        error: "#DC2626",
      },
      borderRadius: {
        panel: "16px",
        input: "9999px",
        badge: "9999px",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(15, 23, 42, 0.08)",
        subtle: "0 1px 3px rgba(15, 23, 42, 0.06)",
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