"use client";
import styled, { css } from "styled-components";
import { tokens as t } from "./tokens";

type Appearance = "primary" | "default" | "subtle" | "warning" | "danger" | "link";
type Spacing    = "compact" | "default";

interface ButtonProps {
  appearance?: Appearance;
  spacing?: Spacing;
  isDisabled?: boolean;
  isSelected?: boolean;
  iconBefore?: React.ReactNode;
  iconAfter?: React.ReactNode;
}

const appearances: Record<Appearance, ReturnType<typeof css>> = {
  primary: css`
    background: ${t.colorBrandBold};
    color: ${t.colorTextInverse};
    &:hover:not(:disabled) { background: ${t.colorBrandBoldHovered}; }
    &:active:not(:disabled) { background: ${t.colorBrandBoldPressed}; }
  `,
  default: css`
    background: ${t.colorBgNeutral};
    color: ${t.colorText};
    &:hover:not(:disabled) { background: ${t.colorBgNeutralHovered}; }
    &:active:not(:disabled) { background: ${t.colorBgNeutralPressed}; }
  `,
  subtle: css`
    background: transparent;
    color: ${t.colorText};
    &:hover:not(:disabled) { background: ${t.colorBgNeutral}; }
    &:active:not(:disabled) { background: ${t.colorBgNeutralHovered}; }
  `,
  warning: css`
    background: ${t.colorWarningBold};
    color: ${t.colorTextInverse};
    &:hover:not(:disabled) { filter: brightness(0.92); }
    &:active:not(:disabled) { filter: brightness(0.84); }
  `,
  danger: css`
    background: ${t.colorDangerBold};
    color: ${t.colorTextInverse};
    &:hover:not(:disabled) { background: ${t.colorDangerHovered}; }
    &:active:not(:disabled) { filter: brightness(0.84); }
  `,
  link: css`
    background: transparent;
    color: ${t.colorTextBrand};
    padding-left: 0;
    padding-right: 0;
    &:hover:not(:disabled) { color: ${t.colorBrandBoldHovered}; text-decoration: underline; }
    &:active:not(:disabled) { color: ${t.colorBrandBoldPressed}; }
  `,
};

export const Button = styled.button.attrs<ButtonProps>((p) => ({
  disabled: p.isDisabled,
  "data-selected": p.isSelected || undefined,
}))<ButtonProps>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  border-radius: ${t.radiusMd};
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeMd};
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  text-decoration: none;
  transition: background ${t.durationFast}, color ${t.durationFast}, filter ${t.durationFast};

  /* Spacing */
  ${(p) => p.spacing === "compact"
    ? css`height: 28px; padding: 0 8px;`
    : css`height: 32px; padding: 0 12px;`
  }

  /* Appearance */
  ${(p) => appearances[p.appearance ?? "default"]}

  /* Selected state */
  ${(p) => p.isSelected && css`
    background: ${t.colorBgSelected};
    color: ${t.colorTextBrand};
    &:hover:not(:disabled) { background: ${t.colorBgSelectedHover}; }
  `}

  /* Disabled */
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Focus */
  &:focus-visible {
    outline: 2px solid ${t.colorBorderFocused};
    outline-offset: 2px;
  }

  /* Icon sizing */
  svg { width: 16px; height: 16px; flex-shrink: 0; }
`;

/** Icon-only button */
export const IconButton = styled(Button)`
  padding: 0;
  width: ${(p) => p.spacing === "compact" ? "28px" : "32px"};
  justify-content: center;
`;
