// Atlassian Design Tokens — dùng trong styled-components
export const tokens = {
  // Brand
  colorBrandBold:         "#0C66E4",
  colorBrandBoldHovered:  "#0055CC",
  colorBrandBoldPressed:  "#09326C",
  colorBrand:             "#388BFF",
  colorBrandSubtlest:     "#E9F2FF",
  colorBrandSubtle:       "#E9F2FF",

  // Text
  colorText:          "#172B4D",
  colorTextSubtle:    "#44546F",
  colorTextSubtlest:  "#8590A2",
  colorTextDisabled:  "#8590A2",
  colorTextInverse:   "#FFFFFF",
  colorTextBrand:     "#0C66E4",
  colorTextDanger:    "#AE2A19",
  colorTextSuccess:   "#216E4E",
  colorTextWarning:   "#974F0C",

  // Backgrounds
  colorBgDefault:        "#FFFFFF",
  colorBgInput:          "#FFFFFF",
  colorBgNeutral:        "#F7F8F9",
  colorBgNeutralHovered: "#F1F2F4",
  colorBgNeutralPressed: "#DFE1E6",
  colorBgSelected:       "#E9F2FF",
  colorBgSelectedHover:  "#CCE0FF",

  // Surfaces
  colorSurface:  "#FFFFFF",
  colorSunken:   "#F7F8F9",

  // Borders
  colorBorder:             "#DCDFE4",
  colorBorderBold:         "#8590A2",
  colorBorderFocused:      "#388BFF",
  colorBorderInput:        "#8590A2",
  colorBorderInputHovered: "#44546F",
  colorBorderSelected:     "#0C66E4",
  colorBorderDanger:       "#E34935",
  colorBorderSuccess:      "#22A06B",
  colorBorderDisabled:     "#DFE1E6",

  // Danger
  colorDangerBold:     "#C9372C",
  colorDangerHovered:  "#AE2A19",
  colorDanger:         "#E34935",
  colorDangerSubtlest: "#FFECEB",

  // Success
  colorSuccessBold:     "#1F845A",
  colorSuccess:         "#22A06B",
  colorSuccessSubtlest: "#DCFFF1",

  // Warning
  colorWarningBold:     "#F18D13",
  colorWarningSubtlest: "#FFF7D6",
  colorBorderWarning:   "#FAA53D",

  // Discovery
  colorDiscoveryBold:     "#6E5DC6",
  colorDiscoverySubtlest: "#F3F0FF",

  // Neutrals
  N0:   "#FFFFFF",
  N10:  "#FAFBFC",
  N20:  "#F7F8F9",
  N30:  "#F1F2F4",
  N40:  "#DFE1E6",
  N50:  "#CFD4DB",
  N60:  "#B3BAC5",
  N70:  "#8590A2",
  N80:  "#626F86",
  N90:  "#44546F",
  N100: "#2C3E5D",
  N200: "#172B4D",
  N900: "#091E42",

  // Shadows
  shadowCard:    "0 1px 1px rgba(9,30,66,0.25), 0 0 0 1px rgba(9,30,66,0.08)",
  shadowRaised:  "0 1px 1px rgba(9,30,66,0.25), 0 0 1px 1px rgba(9,30,66,0.13)",
  shadowOverlay: "0 8px 16px rgba(9,30,66,0.16), 0 0 1px rgba(9,30,66,0.24)",

  // Radius
  radiusSm:   "3px",
  radiusMd:   "4px",
  radiusLg:   "8px",
  radiusFull: "9999px",

  // Typography
  fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif`,
  fontSizeXs:  "11px",
  fontSizeSm:  "12px",
  fontSizeMd:  "14px",
  fontSizeLg:  "16px",
  fontSizeXl:  "20px",
  fontSize2xl: "24px",

  // Motion
  durationFast:   "100ms",
  durationNormal: "200ms",
  ease:           "cubic-bezier(0.15, 1, 0.3, 1)",
} as const;
