import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#06D6A0",
          600: "#059669",
          700: "#047857",
          800: "#065F46",
          900: "#064E3B",
          950: "#022C22",
        },
        accent: {
          DEFAULT: "#118AB2",
          light: "#E0F4FF",
          dark: "#0C6A8A",
        },
        income: {
          DEFAULT: "#00F5D4",
          light: "#CCFFF5",
          dark: "#00A88F",
        },
        expense: {
          DEFAULT: "#FF6B6B",
          light: "#FFE0E0",
          dark: "#CC4444",
        },
        warning: {
          DEFAULT: "#FFD166",
          light: "#FFF3D0",
          dark: "#CC9F33",
        },
        surface: {
          light: "#F4F7FA",
          dark: "#060A13",
          elevated: "#0D1320",
          card: "#131929",
          "card-light": "#FFFFFF",
          muted: "#1A2035",
        },
        navy: {
          50: "#E8ECF1",
          100: "#C5CDD8",
          200: "#9EABC0",
          300: "#7789A8",
          400: "#596F96",
          500: "#3B5584",
          600: "#334A74",
          700: "#293B5E",
          800: "#1F2D49",
          900: "#131929",
          950: "#060A13",
        },
      },
      fontFamily: {
        display: ["Syne", "system-ui", "sans-serif"],
        sans: ["Outfit", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      animation: {
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down": "slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fadeIn 0.5s ease-out",
        "scale-in": "scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "spin-slow": "spin 3s linear infinite",
        "pulse-glow": "pulseGlow 3s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "gradient-shift": "gradientShift 8s ease-in-out infinite",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "mesh-gradient": "linear-gradient(135deg, var(--mesh-1) 0%, var(--mesh-2) 50%, var(--mesh-3) 100%)",
      },
      boxShadow: {
        "glow-sm": "0 0 15px -3px rgba(6, 214, 160, 0.3)",
        "glow": "0 0 30px -5px rgba(6, 214, 160, 0.4)",
        "glow-lg": "0 0 50px -10px rgba(6, 214, 160, 0.5)",
        "card": "0 1px 3px rgba(0, 0, 0, 0.04), 0 6px 16px rgba(0, 0, 0, 0.06)",
        "card-hover": "0 4px 12px rgba(0, 0, 0, 0.08), 0 16px 32px rgba(0, 0, 0, 0.1)",
        "inner-glow": "inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
