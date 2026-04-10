/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#10B981",
        secondary: "#6366F1",
        accent: "#F59E0B",
        background: "#0F172A",
        surface: "#1E293B",
        textPrimary: "#F8FAFC",
        textMuted: "#94A3B8",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      boxShadow: {
        glow: "0 20px 80px rgba(16, 185, 129, 0.15)",
      },
      backgroundImage: {
        "hero-radial":
          "radial-gradient(circle at top, rgba(16,185,129,0.24), transparent 42%), radial-gradient(circle at bottom right, rgba(99,102,241,0.18), transparent 30%)",
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 1.8s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-300% 0" },
          "100%": { backgroundPosition: "300% 0" },
        },
      },
    },
  },
  plugins: [],
};
