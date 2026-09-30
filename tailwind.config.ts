import type { Config } from "tailwindcss";

/**
 * Design tokens for Living+ / Aangan.
 * Source: Stitch project "Living+ Community App Screen" (Home screen theme).
 * Semantic, Material-style names so they map 1:1 to the design file.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#fef8f4",
        surface: {
          DEFAULT: "#fef8f4",
          dim: "#dfd9d5",
          bright: "#fef8f4",
          variant: "#e7e1de",
          tint: "#a33e0d",
          "container-lowest": "#ffffff",
          "container-low": "#f8f2ef",
          container: "#f3ede9",
          "container-high": "#ede7e3",
          "container-highest": "#e7e1de",
        },
        "on-background": "#1d1b19",
        "on-surface": {
          DEFAULT: "#1d1b19",
          variant: "#57423a",
        },
        outline: {
          DEFAULT: "#8b7269",
          variant: "#dec0b6",
        },
        primary: {
          DEFAULT: "#a33d0d",
          container: "#c45525",
          fixed: "#ffdbce",
          "fixed-dim": "#ffb59a",
        },
        "on-primary": {
          DEFAULT: "#ffffff",
          container: "#100200",
          fixed: "#370e00",
          "fixed-variant": "#802a00",
        },
        secondary: {
          DEFAULT: "#486552",
          container: "#caebd2",
          fixed: "#caebd2",
          "fixed-dim": "#aeceb7",
        },
        "on-secondary": {
          DEFAULT: "#ffffff",
          container: "#4d6b58",
          fixed: "#042012",
          "fixed-variant": "#304d3b",
        },
        tertiary: {
          DEFAULT: "#875200",
          container: "#a76910",
          fixed: "#ffddba",
          "fixed-dim": "#ffb866",
        },
        "on-tertiary": {
          DEFAULT: "#ffffff",
          container: "#0a0400",
          fixed: "#2b1700",
          "fixed-variant": "#673d00",
        },
        error: {
          DEFAULT: "#ba1a1a",
          container: "#ffdad6",
        },
        "on-error": {
          DEFAULT: "#ffffff",
          container: "#93000a",
        },
        "inverse-surface": "#32302e",
        "inverse-on-surface": "#f6f0ec",
        "inverse-primary": "#ffb59a",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      spacing: {
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "1rem",
        "space-lg": "1.5rem",
        "space-xl": "2rem",
        gutter: "1rem",
        margin: "1.25rem",
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "label-sm": ["11px", { lineHeight: "14px", fontWeight: "600" }],
        "label-md": ["12px", { lineHeight: "16px", fontWeight: "600" }],
        "label-lg": ["14px", { lineHeight: "20px", fontWeight: "600" }],
        "body-sm": ["12px", { lineHeight: "18px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "headline-sm": ["18px", { lineHeight: "24px", fontWeight: "600" }],
        "headline-md": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "headline-lg": ["24px", { lineHeight: "32px", fontWeight: "700" }],
        "headline-xl-mobile": ["28px", { lineHeight: "36px", fontWeight: "700" }],
        "headline-xl": ["36px", { lineHeight: "44px", fontWeight: "700" }],
      },
      boxShadow: {
        card: "0 1px 3px rgba(36, 34, 32, 0.06), 0 1px 2px rgba(36, 34, 32, 0.04)",
        bar: "0 2px 12px rgba(36, 34, 32, 0.03)",
        "bar-top": "0 -4px 16px rgba(36, 34, 32, 0.05)",
        fab: "0 6px 16px rgba(196, 85, 37, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
