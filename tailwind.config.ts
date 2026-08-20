import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./data/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sunset: {
          gold: "#F3B23E",
          coral: "#FF6B3D",
          blush: "#FFB37A",
        },
        dawn: {
          "grey-blue": "#8B96A8",
        },
        night: {
          navy: "#12141C",
        },
        rust: {
          orange: "#C1531C",
        },
        sage: {
          green: "#A9B98F",
        },
        olive: "#6E7A4B",
        mustard: "#E3B123",
        denim: {
          blue: "#7E9BC0",
        },
        cream: {
          khaki: "#E7DEC4",
        },
        clay: {
          brown: "#4A3524",
        },
        dusty: {
          pink: "#D98E7C",
        },
        pop: {
          red: "#D8432E",
          blue: "#3A7FB5",
          green: "#3F7A4C",
        },
        paper: "#F6F2E9",
        ink: "#17140F",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        wordmark: ["var(--font-wordmark)", "system-ui", "sans-serif"],
      },
      transitionTimingFunction: {
        signature: "cubic-bezier(0.65, 0, 0.35, 1)",
      },
      maxWidth: {
        phone: "430px",
        "phone-lg": "640px",
      },
      spacing: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-left": "env(safe-area-inset-left)",
        "safe-right": "env(safe-area-inset-right)",
      },
    },
  },
  plugins: [],
};

export default config;
