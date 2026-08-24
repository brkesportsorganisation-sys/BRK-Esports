import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#F8F9FA",
        surface: {
          DEFAULT: "#FFFFFF",
          light: "#F1F5F9",
          border: "#E2E8F0",
          dark: "#0F172A",
        },
        brand: {
          red: "#FF1E42",
          orange: "#FF6B00",
          gold: "#FFD700",
          cyan: "#00F0FF",
          purple: "#9D00FF",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "cyber-gradient": "linear-gradient(135deg, #FF1E42 0%, #FF6B00 50%, #9D00FF 100%)",
        "esports-gradient": "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
        "neon-glow": "radial-gradient(circle at center, rgba(255, 30, 66, 0.2) 0%, rgba(15, 23, 42, 0) 70%)",
      },
      boxShadow: {
        "neon-red": "0 8px 25px rgba(255, 30, 66, 0.25)",
        "neon-orange": "0 8px 25px rgba(255, 107, 0, 0.25)",
        "neon-cyan": "0 8px 25px rgba(0, 240, 255, 0.25)",
        "cyber": "0 8px 30px 0 rgba(0, 0, 0, 0.08)",
      },
      borderRadius: {
        "3xl": "1.5rem", // 24px
        "4xl": "2rem",   // 32px
      },
      fontFamily: {
        heading: ["var(--font-rajdhani)", "Rajdhani", "sans-serif"],
        body: ["var(--font-inter)", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
