import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "Oxygen",
          "Ubuntu",
          "sans-serif",
        ],
      },
      fontSize: {
        "2xs": ["11px", "16px"],
        xs:    ["12px", "16px"],
        sm:    ["14px", "20px"],
        base:  ["14px", "20px"],
        md:    ["14px", "20px"],
        lg:    ["16px", "24px"],
        xl:    ["20px", "24px"],
        "2xl": ["24px", "28px"],
        "3xl": ["29px", "32px"],
      },
      colors: {
        // Atlassian brand
        brand: {
          bold:      "var(--color-brand-bold)",
          hovered:   "var(--color-brand-bold-hovered)",
          pressed:   "var(--color-brand-bold-pressed)",
          DEFAULT:   "var(--color-brand)",
          subtle:    "var(--color-brand-subtle)",
          subtlest:  "var(--color-brand-subtlest)",
        },
        // Text
        "text-default":    "var(--color-text)",
        "text-subtle":     "var(--color-text-subtle)",
        "text-subtlest":   "var(--color-text-subtlest)",
        "text-disabled":   "var(--color-text-disabled)",
        "text-inverse":    "var(--color-text-inverse)",
        "text-brand":      "var(--color-text-brand)",
        "text-danger":     "var(--color-text-danger)",
        "text-success":    "var(--color-text-success)",
        "text-warning":    "var(--color-text-warning)",
        // Backgrounds
        "bg-default":      "var(--color-bg-default)",
        "bg-neutral":      "var(--color-bg-neutral)",
        "bg-neutral-hovered":  "var(--color-bg-neutral-hovered)",
        "bg-selected":     "var(--color-bg-selected)",
        "bg-selected-hovered": "var(--color-bg-selected-hovered)",
        // Surfaces
        surface:           "var(--color-surface)",
        "surface-overlay": "var(--color-surface-overlay)",
        "surface-raised":  "var(--color-surface-raised)",
        "surface-sunken":  "var(--color-surface-sunken)",
        // Borders
        "border-default":  "var(--color-border)",
        "border-bold":     "var(--color-border-bold)",
        "border-focused":  "var(--color-border-focused)",
        "border-input":    "var(--color-border-input)",
        "border-selected": "var(--color-border-selected)",
        "border-danger":   "var(--color-border-danger)",
        "border-disabled": "var(--color-border-disabled)",
        // States
        danger: {
          bold:     "var(--color-danger-bold)",
          hovered:  "var(--color-danger-bold-hovered)",
          DEFAULT:  "var(--color-danger)",
          subtle:   "var(--color-danger-subtle)",
          subtlest: "var(--color-danger-subtlest)",
        },
        success: {
          bold:     "var(--color-success-bold)",
          DEFAULT:  "var(--color-success)",
          subtlest: "var(--color-success-subtlest)",
        },
        warning: {
          bold:     "var(--color-warning-bold)",
          DEFAULT:  "var(--color-warning)",
          subtlest: "var(--color-warning-subtlest)",
        },
        discovery: {
          bold:     "var(--color-discovery-bold)",
          subtlest: "var(--color-discovery-subtlest)",
        },
        // Neutrals
        N: {
          0:   "#FFFFFF",
          10:  "#FAFBFC",
          20:  "#F7F8F9",
          30:  "#F1F2F4",
          40:  "#DFE1E6",
          50:  "#CFD4DB",
          60:  "#B3BAC5",
          70:  "#8590A2",
          80:  "#626F86",
          90:  "#44546F",
          100: "#2C3E5D",
          200: "#172B4D",
          900: "#091E42",
        },
        // Legacy shadcn compat
        background:  "var(--color-neutral-20)",
        foreground:  "var(--color-text)",
        card:        "var(--color-surface)",
        "card-foreground": "var(--color-text)",
        primary:     "var(--color-brand-bold)",
        "primary-foreground": "var(--color-text-inverse)",
        secondary:   "var(--color-bg-neutral)",
        "secondary-foreground": "var(--color-text)",
        muted:       "var(--color-neutral-30)",
        "muted-foreground": "var(--color-text-subtle)",
        accent:      "var(--color-bg-selected)",
        "accent-foreground": "var(--color-text-brand)",
        destructive: "var(--color-danger-bold)",
        "destructive-foreground": "var(--color-text-inverse)",
        border:      "var(--color-border)",
        input:       "var(--color-border-input)",
        ring:        "var(--color-border-focused)",
        popover:     "var(--color-surface)",
        "popover-foreground": "var(--color-text)",
      },
      borderRadius: {
        sm:   "var(--radius-sm)",   // 3px
        DEFAULT: "var(--radius-md)", // 4px
        md:   "var(--radius-md)",   // 4px
        lg:   "var(--radius-lg)",   // 8px
        xl:   "var(--radius-xl)",   // 12px
        full: "var(--radius-full)",
      },
      boxShadow: {
        card:    "var(--shadow-card)",
        raised:  "var(--shadow-raised)",
        overlay: "var(--shadow-overlay)",
        overflow: "var(--shadow-overflow)",
      },
      transitionDuration: {
        fast:   "100ms",
        normal: "200ms",
        slow:   "350ms",
      },
      spacing: {
        "025": "2px",
        "050": "4px",
        "075": "6px",
        "100": "8px",
        "150": "12px",
        "200": "16px",
        "250": "20px",
        "300": "24px",
        "400": "32px",
        "500": "40px",
        "600": "48px",
      },
    },
  },
  plugins: [],
};
export default config;
