import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // RD Tech Bridge Brand Colors
        brand: {
          bronze: "#CD7F32",
          red: "#C41E3A",
          "dark-bronze": "#8B4513",
          "light-bronze": "#DEB887",
          "deep-red": "#8B0000",
        },
        // Alternative naming for easier use
        rc: {
          bronze: "#CD7F32",
          red: "#C41E3A",
          "bronze-dark": "#8B4513",
          "bronze-light": "#DEB887",
          "red-dark": "#8B0000",
        },
        // Public site design system tokens
        "deep-navy": "#0A0F1E",
        "golden-amber": "#C67C2A",
        "emerald-ai": "#1ED28C",
        "ice-blue-bg": "#F5F7FF",
        "pure-white": "#FFFFFF",
        "surface-variant": "#e0e2ea",
        "on-surface-variant": "#46464c",
        "surface-container": "#ebeef6",
        "on-surface": "#181c21",
      },
      fontFamily: {
        brand: ["Inter", "Arial", "sans-serif"],
      },
      boxShadow: {
        brand:
          "0 4px 6px -1px rgba(205, 127, 50, 0.1), 0 2px 4px -1px rgba(205, 127, 50, 0.06)",
        "brand-lg":
          "0 10px 15px -3px rgba(205, 127, 50, 0.1), 0 4px 6px -2px rgba(205, 127, 50, 0.05)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
