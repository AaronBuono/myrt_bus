import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#002868",
          amber: "#C97B0A",
          gold: "#FFD700",
          green: "#1B4332",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "DM Sans", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
