import styled from "styled-components";
import { tokens as t } from "./tokens";

type BadgeAppearance = "default" | "primary" | "success" | "warning" | "danger" | "discovery" | "neutral";
type BadgeStyle = "bold" | "subtle";

interface BadgeProps {
  appearance?: BadgeAppearance;
  styleVariant?: BadgeStyle;
}

const styles: Record<BadgeAppearance, Record<BadgeStyle, { bg: string; color: string }>> = {
  default:   { bold: { bg: t.N40,  color: t.N90  }, subtle: { bg: t.N20,  color: t.N80 } },
  primary:   { bold: { bg: t.colorBrandBold,     color: "white" }, subtle: { bg: t.colorBrandSubtlest, color: t.colorTextBrand } },
  success:   { bold: { bg: t.colorSuccessBold,   color: "white" }, subtle: { bg: t.colorSuccessSubtlest, color: t.colorTextSuccess } },
  warning:   { bold: { bg: t.colorWarningBold,   color: "white" }, subtle: { bg: t.colorWarningSubtlest, color: t.colorTextWarning } },
  danger:    { bold: { bg: t.colorDangerBold,    color: "white" }, subtle: { bg: t.colorDangerSubtlest,  color: t.colorTextDanger } },
  discovery: { bold: { bg: t.colorDiscoveryBold, color: "white" }, subtle: { bg: t.colorDiscoverySubtlest, color: t.colorDiscoveryBold } },
  neutral:   { bold: { bg: t.N70,  color: "white" }, subtle: { bg: t.colorBgNeutral, color: t.colorTextSubtle } },
};

export const Badge = styled.span<BadgeProps>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: ${t.radiusFull};
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeXs};
  font-weight: 700;
  white-space: nowrap;
  line-height: 1.4;
  background: ${(p) => styles[p.appearance ?? "default"][p.styleVariant ?? "subtle"].bg};
  color: ${(p) => styles[p.appearance ?? "default"][p.styleVariant ?? "subtle"].color};
`;

// Lozenge — same as badge but rectangular
export const Lozenge = styled(Badge)`
  border-radius: ${t.radiusSm};
  text-transform: uppercase;
  letter-spacing: 0.03em;
`;

// Count/number badge
export const CountBadge = styled.span<{ appearance?: "default" | "danger" | "primary" }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: ${t.radiusFull};
  font-family: ${t.fontFamily};
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  background: ${(p) =>
    p.appearance === "danger"  ? t.colorDangerBold :
    p.appearance === "primary" ? t.colorBrandBold  :
    t.N40};
  color: ${(p) =>
    p.appearance === "danger" || p.appearance === "primary" ? "white" : t.N90};
`;

// Dot indicator (status)
export const StatusDot = styled.span<{ color?: "green" | "red" | "yellow" | "blue" | "neutral" }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: ${t.radiusFull};
  background: ${(p) =>
    p.color === "green"   ? t.colorSuccess :
    p.color === "red"     ? t.colorDanger :
    p.color === "yellow"  ? t.colorWarningBold :
    p.color === "blue"    ? t.colorBrand :
    t.N60};
  flex-shrink: 0;
`;
