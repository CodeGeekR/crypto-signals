module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        hero: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        primary: {
          900: "#0a0e27",
          800: "#1a1f3a",
          700: "#2a2f54",
          600: "#3a4574",
        },
        accent: {
          gold: "#f7931a",
          green: "#00d4aa",
          red: "#ff4757",
          blue: "#3742fa",
        },
        gray: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        }
      },
      backgroundImage: {
        "gradient-hero": "linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #2a2f54 100%)",
        "gradient-card": "linear-gradient(145deg, #1a1f3a 0%, #2a2f54 100%)",
        "gradient-text": "linear-gradient(90deg, #f7931a 0%, #00d4aa 100%)",
      },
      animation: {
        "text-gradient": "text-gradient 3s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-up": "slide-up 0.8s ease-out forwards",
        "fade-in": "fade-in 1s ease-out forwards",
        "particle-drift": "particle-drift 15s linear infinite",
      },
      keyframes: {
        "text-gradient": {
          "0%, 100%": { "background-position": "0% 50%" },
          "50%": { "background-position": "100% 50%" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-glow": {
          "0%, 100%": {
            "box-shadow": "0 0 20px rgba(247, 147, 26, 0.5)",
            transform: "scale(1)",
          },
          "50%": {
            "box-shadow": "0 0 40px rgba(247, 147, 26, 0.8)",
            transform: "scale(1.05)",
          },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "particle-drift": {
          "0%": { transform: "translateY(0px) rotate(0deg)" },
          "100%": { transform: "translateY(-100vh) rotate(360deg)" },
        }
      },
      boxShadow: {
        "neo-inset": "inset 8px 8px 16px #0a0e27, inset -8px -8px 16px #2a2f54",
        "neo-raised": "8px 8px 16px #0a0e27, -8px -8px 16px #2a2f54",
        "glow-gold": "0 0 20px rgba(247, 147, 26, 0.3)",
        "glow-green": "0 0 20px rgba(0, 212, 170, 0.3)",
      }
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
    require("@tailwindcss/aspect-ratio")
  ],
};