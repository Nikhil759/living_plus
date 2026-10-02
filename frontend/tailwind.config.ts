import type { Config } from "tailwindcss";

/**
 * Living+ design tokens. Values live in CSS variables (globals.css).
 * Sky blue is the only accent.
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
        canvas: "var(--bg)",
        card: "var(--card)",
        ink: {
          DEFAULT: "var(--text)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
        },
        hairline: "var(--hairline)",
        quiet: "var(--fill-quiet)",
        primary: {
          DEFAULT: "var(--primary)",
          tint: "var(--primary-tint)",
          pressed: "var(--primary-pressed)",
        },
        "on-primary": "#ffffff",
        status: {
          green: "var(--status-green)",
          amber: "var(--status-amber)",
          red: "var(--status-red)",
        },
        /* Legacy aliases — mapped to the new palette so older class names stay valid. */
        background: "var(--bg)",
        surface: {
          DEFAULT: "var(--bg)",
          dim: "var(--fill-quiet)",
          bright: "var(--card)",
          variant: "var(--fill-quiet)",
          tint: "var(--primary)",
          "container-lowest": "var(--card)",
          "container-low": "var(--fill-quiet)",
          container: "var(--fill-quiet)",
          "container-high": "var(--fill-quiet)",
          "container-highest": "var(--fill-quiet)",
        },
        "on-background": "var(--text)",
        "on-surface": {
          DEFAULT: "var(--text)",
          variant: "var(--text-secondary)",
        },
        outline: {
          DEFAULT: "var(--hairline)",
          variant: "var(--hairline)",
        },
        "primary-container": "var(--primary-pressed)",
        "primary-fixed": "var(--primary-tint)",
        "primary-fixed-dim": "var(--primary-tint)",
        "on-primary-container": "#ffffff",
        "on-primary-fixed": "var(--primary)",
        "on-primary-fixed-variant": "var(--primary)",
        secondary: {
          DEFAULT: "var(--text-secondary)",
          container: "var(--fill-quiet)",
          fixed: "var(--fill-quiet)",
          "fixed-dim": "var(--fill-quiet)",
        },
        "on-secondary": {
          DEFAULT: "var(--text)",
          container: "var(--text)",
          fixed: "var(--text)",
          "fixed-variant": "var(--text-secondary)",
        },
        tertiary: {
          DEFAULT: "var(--text-tertiary)",
          container: "var(--fill-quiet)",
          fixed: "var(--fill-quiet)",
          "fixed-dim": "var(--fill-quiet)",
        },
        "on-tertiary": {
          DEFAULT: "var(--text)",
          container: "var(--text)",
          fixed: "var(--text-tertiary)",
          "fixed-variant": "var(--text-tertiary)",
        },
        error: {
          DEFAULT: "var(--status-red)",
          container: "var(--fill-quiet)",
        },
        "on-error": {
          DEFAULT: "#ffffff",
          container: "var(--status-red)",
        },
        "inverse-surface": "var(--text)",
        "inverse-on-surface": "var(--card)",
        "inverse-primary": "var(--primary)",
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        lg: "14px",
        xl: "22px",
        tile: "14px",
        card: "22px",
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
        section: "3.5rem",
      },
      maxWidth: {
        content: "1120px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          '"SF Pro Text"',
          "var(--font-inter)",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
      },
      fontSize: {
        "large-title": [
          "40px",
          { lineHeight: "44px", fontWeight: "600", letterSpacing: "-0.025em" },
        ],
        title: [
          "22px",
          { lineHeight: "28px", fontWeight: "600", letterSpacing: "-0.015em" },
        ],
        headline: ["17px", { lineHeight: "22px", fontWeight: "600" }],
        body: ["15px", { lineHeight: "22px", fontWeight: "400" }],
        callout: ["14px", { lineHeight: "20px", fontWeight: "400" }],
        caption: ["13px", { lineHeight: "18px", fontWeight: "400" }],
        /* Legacy type aliases */
        "label-sm": ["13px", { lineHeight: "18px", fontWeight: "400" }],
        "label-md": ["13px", { lineHeight: "18px", fontWeight: "600" }],
        "label-lg": ["15px", { lineHeight: "22px", fontWeight: "600" }],
        "body-sm": ["13px", { lineHeight: "18px", fontWeight: "400" }],
        "body-md": ["15px", { lineHeight: "22px", fontWeight: "400" }],
        "body-lg": ["15px", { lineHeight: "22px", fontWeight: "400" }],
        "headline-sm": ["17px", { lineHeight: "22px", fontWeight: "600" }],
        "headline-md": ["22px", { lineHeight: "28px", fontWeight: "600" }],
        "headline-lg": ["22px", { lineHeight: "28px", fontWeight: "600" }],
        "headline-xl-mobile": [
          "40px",
          { lineHeight: "44px", fontWeight: "600", letterSpacing: "-0.025em" },
        ],
        "headline-xl": [
          "40px",
          { lineHeight: "44px", fontWeight: "600", letterSpacing: "-0.025em" },
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)",
        hover: "0 2px 4px rgba(0,0,0,0.05), 0 16px 40px rgba(0,0,0,0.08)",
        bar: "none",
        "bar-top": "none",
        fab: "none",
      },
      transitionDuration: {
        premium: "250ms",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
