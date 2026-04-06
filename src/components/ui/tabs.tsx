"use client";
import * as RadixTabs from "@radix-ui/react-tabs";
import styled from "styled-components";
import { tokens as t } from "./tokens";

// ─── Root ─────────────────────────────────────────────────────────────────────

export const Tabs = RadixTabs.Root;

// ─── Tab list ─────────────────────────────────────────────────────────────────

export const TabList = styled(RadixTabs.List)<{ variant?: "line" | "contained" }>`
  display: flex;
  align-items: center;
  gap: ${(p) => p.variant === "contained" ? "2px" : "0"};
  ${(p) => p.variant !== "contained" && `border-bottom: 2px solid ${t.colorBorder};`}
  ${(p) => p.variant === "contained" && `
    background: ${t.colorBgNeutral};
    padding: 4px;
    border-radius: ${t.radiusMd};
    display: inline-flex;
  `}
`;

// ─── Tab trigger ──────────────────────────────────────────────────────────────

export const Tab = styled(RadixTabs.Trigger)<{ variant?: "line" | "contained" }>`
  all: unset;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  height: 36px;
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeMd};
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background ${t.durationFast}, color ${t.durationFast};
  position: relative;

  ${(p) => p.variant !== "contained" ? `
    color: ${t.colorTextSubtle};
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;

    &:hover { color: ${t.colorText}; }

    &[data-state="active"] {
      color: ${t.colorTextBrand};
      border-bottom-color: ${t.colorBrandBold};
      font-weight: 600;
    }
  ` : `
    color: ${t.colorTextSubtle};
    border-radius: ${t.radiusSm};

    &:hover { color: ${t.colorText}; background: ${t.colorBgNeutralHovered}; }

    &[data-state="active"] {
      color: ${t.colorText};
      background: white;
      font-weight: 600;
      box-shadow: ${t.shadowCard};
    }
  `}

  &:focus-visible { outline: 2px solid ${t.colorBorderFocused}; outline-offset: 2px; }
  &[data-disabled] { opacity: 0.5; cursor: not-allowed; }

  svg { width: 14px; height: 14px; }
`;

// ─── Badge count on tab ───────────────────────────────────────────────────────

export const TabBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: ${t.radiusFull};
  background: ${t.colorBgNeutralHovered};
  font-size: ${t.fontSizeXs};
  font-weight: 700;
  color: ${t.colorTextSubtle};
  line-height: 1;

  [data-state="active"] & {
    background: ${t.colorBrandSubtlest};
    color: ${t.colorTextBrand};
  }
`;

// ─── Tab panel ────────────────────────────────────────────────────────────────

export const TabPanel = styled(RadixTabs.Content)`
  &:focus-visible { outline: none; }

  &[data-state="inactive"] { display: none; }
`;
