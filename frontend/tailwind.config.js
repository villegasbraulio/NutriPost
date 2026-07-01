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
        surfaceAlt: "#162033",
        textPrimary: "#F8FAFC",
        textMuted: "#94A3B8",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"],
      },
      boxShadow: {
        glow: "0 20px 80px rgba(16, 185, 129, 0.15)",
        panel: "0 30px 90px rgba(8, 15, 30, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        soft: "0 18px 40px rgba(15, 23, 42, 0.28)",
      },
      backgroundImage: {
        "hero-radial":
          "radial-gradient(circle at top, rgba(16,185,129,0.24), transparent 42%), radial-gradient(circle at bottom right, rgba(99,102,241,0.18), transparent 30%)",
        mesh:
          "radial-gradient(circle at 20% 20%, rgba(16,185,129,0.18), transparent 0 28%), radial-gradient(circle at 80% 16%, rgba(99,102,241,0.18), transparent 0 24%), radial-gradient(circle at 52% 82%, rgba(245,158,11,0.14), transparent 0 22%)",
        "panel-gradient":
          "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 1.8s linear infinite",
        drift: "drift 18s ease-in-out infinite",
        "pulse-glow": "pulseGlow 2.4s ease-in-out infinite",
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
        drift: {
          "0%, 100%": { transform: "translate3d(0px, 0px, 0px) scale(1)" },
          "50%": { transform: "translate3d(0px, -18px, 0px) scale(1.03)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(16, 185, 129, 0.18)" },
          "50%": { boxShadow: "0 0 0 12px rgba(16, 185, 129, 0)" },
        },
      },
    },
  },
  plugins: [],
};
