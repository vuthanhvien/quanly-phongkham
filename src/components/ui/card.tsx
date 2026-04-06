import React from "react";
import styled from "styled-components";
import { tokens as t } from "./tokens";

// ─── Box — layout primitive ───────────────────────────────────────────────────

interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 0 | 8 | 12 | 16 | 20 | 24 | 32;
  background?: "white" | "neutral" | "selected" | "sunken";
  border?: boolean;
  radius?: "none" | "sm" | "md" | "lg";
}

const bgMap = {
  white:    "white",
  neutral:  t.colorBgNeutral,
  selected: t.colorBgSelected,
  sunken:   t.colorSunken,
};

const radiusMap = {
  none: "0",
  sm:   t.radiusSm,
  md:   t.radiusMd,
  lg:   t.radiusLg,
};

export const Box = styled.div<BoxProps>`
  padding: ${(p) => p.padding ?? 0}px;
  background: ${(p) => bgMap[p.background ?? "white"]};
  border: ${(p) => p.border ? `1px solid ${t.colorBorder}` : "none"};
  border-radius: ${(p) => radiusMap[p.radius ?? "none"]};
`;

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: "flat" | "raised" | "overlay";
}

const elevationMap = {
  flat:    t.shadowCard,
  raised:  t.shadowRaised,
  overlay: t.shadowOverlay,
};

export const Card = styled.div<CardProps>`
  background: white;
  border-radius: ${t.radiusLg};
  border: 1px solid ${t.colorBorder};
  box-shadow: ${(p) => elevationMap[p.elevation ?? "flat"]};
  overflow: hidden;
`;

// ─── Card sub-components ──────────────────────────────────────────────────────

export const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 16px 12px;
`;

export const CardTitle = styled.h3`
  margin: 0;
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeMd};
  font-weight: 600;
  color: ${t.colorText};
  line-height: 1.3;
`;

export const CardDescription = styled.p`
  margin: 2px 0 0;
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeSm};
  color: ${t.colorTextSubtle};
`;

export const CardContent = styled.div`
  padding: 0 16px 16px;
`;

export const CardFooter = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid ${t.colorBorder};
  background: ${t.colorBgNeutral};
`;

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCardRoot = styled(Card)`
  cursor: default;
`;

const StatIconBox = styled.div<{ color: string; bg: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: ${t.radiusMd};
  background: ${(p) => p.bg};
  color: ${(p) => p.color};
  flex-shrink: 0;
  svg { width: 18px; height: 18px; }
`;

const StatValue = styled.div`
  font-family: ${t.fontFamily};
  font-size: 22px;
  font-weight: 700;
  color: ${t.colorText};
  line-height: 1.2;
  margin: 2px 0;
`;

const StatLabel = styled.div`
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeXs};
  font-weight: 600;
  color: ${t.colorTextSubtlest};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StatDesc = styled.div`
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeSm};
  color: ${t.colorTextSubtle};
`;

const colorPresets = {
  blue:    { color: t.colorBrandBold,     bg: t.colorBrandSubtlest },
  green:   { color: t.colorSuccessBold,   bg: t.colorSuccessSubtlest },
  red:     { color: t.colorDangerBold,    bg: t.colorDangerSubtlest },
  yellow:  { color: t.colorWarningBold,   bg: t.colorWarningSubtlest },
  purple:  { color: t.colorDiscoveryBold, bg: t.colorDiscoverySubtlest },
  neutral: { color: t.colorTextSubtle,    bg: t.colorBgNeutral },
};

interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  color?: keyof typeof colorPresets;
  trend?: { value: number; positive?: boolean };
  className?: string;
}

export function StatCard({ label, value, description, icon, color = "blue", trend, className }: StatCardProps) {
  const preset = colorPresets[color];
  return (
    <StatCardRoot className={className}>
      <CardHeader>
        <div style={{ flex: 1, minWidth: 0 }}>
          <StatLabel>{label}</StatLabel>
          <StatValue>{value}</StatValue>
          {description && <StatDesc>{description}</StatDesc>}
          {trend && (
            <div style={{
              marginTop: 4,
              fontSize: t.fontSizeSm,
              fontWeight: 600,
              color: trend.positive ? t.colorTextSuccess : t.colorTextDanger,
            }}>
              {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        {icon && <StatIconBox color={preset.color} bg={preset.bg}>{icon}</StatIconBox>}
      </CardHeader>
    </StatCardRoot>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;

  h2, h3, h4 { margin: 0; }
`;
