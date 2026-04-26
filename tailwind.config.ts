import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light purple theme for university IDP
        lavender: {
          50: "#faf7ff",
          100: "#f3edff",
          200: "#e6d9ff",
          300: "#d4bcff",
          400: "#bd96ff",
          500: "#a474f5",
          600: "#8b54e6",
          700: "#7340c8",
          800: "#5d35a3",
          900: "#4a2d82",
          950: "#2e1a55",
        },
        risk: {
          low: "#10b981",
          medium: "#f59e0b",
          high: "#ef4444",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 4px 12px -2px rgba(116, 70, 200, 0.08), 0 2px 4px -2px rgba(116, 70, 200, 0.06)",
        "card-hover": "0 8px 24px -4px rgba(116, 70, 200, 0.18), 0 4px 8px -2px rgba(116, 70, 200, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
