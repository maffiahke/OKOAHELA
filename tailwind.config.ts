import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1B8B00",
          bright: "#01FF01",
          dark: "#063D00",
          deep: "#0B2B02",
          mid: "#14A30B",
          soft: "#E7F5E2",
          softer: "#F0F9EC",
        },
        surface: "#F5F8F4",
        ink: "#102010",
      },
      fontFamily: {
        sans: [
          "Plus Jakarta Sans",
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
      borderRadius: {
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 2px 12px -2px rgba(6, 61, 0, 0.08), 0 1px 3px rgba(6, 61, 0, 0.06)",
        float: "0 12px 32px -8px rgba(6, 61, 0, 0.22)",
        brand: "0 8px 24px -6px rgba(27, 139, 0, 0.45)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(314deg, #1B8B00 0%, #01FF01 74%)",
        "brand-dark": "linear-gradient(160deg, #063D00 0%, #1B8B00 90%)",
        "home-radial":
          "radial-gradient(125% 105% at 50% 0%, #063D00 0%, #0B4A01 35%, #1B8B00 62%, #9AA30A 82%, #FACC15 100%)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s linear infinite",
        pulseSoft: "pulseSoft 1.8s ease-in-out infinite",
        floaty: "floaty 3.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
