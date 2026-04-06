"use client";
import styled from "styled-components";
import { tokens as t } from "./tokens";

// ─── Layout shell ─────────────────────────────────────────────────────────────

export const AppShell = styled.div`
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: ${t.colorBgNeutral};
`;

export const MainContent = styled.main`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export const SidebarRoot = styled.nav`
  width: 224px;
  flex-shrink: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${t.N200};
  overflow: hidden;
`;

// ─── Logo area ────────────────────────────────────────────────────────────────

export const SidebarLogo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
`;

export const SidebarLogoIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: ${t.radiusMd};
  background: ${t.colorBrandBold};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  svg { width: 18px; height: 18px; }
`;

export const SidebarLogoText = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const SidebarLogoTitle = styled.span`
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeMd};
  font-weight: 700;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const SidebarLogoBranch = styled.span`
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeSm};
  color: rgba(255,255,255,0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

// ─── Nav section ──────────────────────────────────────────────────────────────

export const SidebarNav = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
`;

export const SidebarSection = styled.div`
  padding: 0 8px;

  & + & { margin-top: 4px; }
`;

export const SidebarSectionLabel = styled.div`
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeXs};
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255,255,255,0.35);
  padding: 12px 8px 4px;
`;

// ─── Nav item ─────────────────────────────────────────────────────────────────

interface NavItemProps {
  $active?: boolean;
}

export const NavItem = styled.a<NavItemProps>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  height: 36px;
  border-radius: ${t.radiusMd};
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeMd};
  font-weight: ${(p) => p.$active ? 600 : 400};
  color: ${(p) => p.$active ? "white" : "rgba(255,255,255,0.72)"};
  background: ${(p) => p.$active ? "rgba(255,255,255,0.14)" : "transparent"};
  text-decoration: none;
  cursor: pointer;
  transition: background ${t.durationFast}, color ${t.durationFast};
  position: relative;

  &:hover {
    background: rgba(255,255,255,0.10);
    color: white;
    text-decoration: none;
  }

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    opacity: ${(p) => p.$active ? 1 : 0.72};
  }

  /* Active indicator */
  ${(p) => p.$active && `
    &::before {
      content: '';
      position: absolute;
      left: -8px;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 20px;
      border-radius: 0 2px 2px 0;
      background: white;
    }
  `}
`;

export const NavItemText = styled.span`
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

export const NavItemBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: ${t.radiusFull};
  background: ${t.colorBrandBold};
  font-size: 11px;
  font-weight: 700;
  color: white;
  line-height: 1;
`;

// ─── User area ────────────────────────────────────────────────────────────────

export const SidebarUser = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
  cursor: pointer;

  &:hover { background: rgba(255,255,255,0.06); }
`;

export const UserAvatar = styled.div`
  width: 28px;
  height: 28px;
  border-radius: ${t.radiusFull};
  background: ${t.colorBrandBold};
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeSm};
  font-weight: 700;
  color: white;
  flex-shrink: 0;
  text-transform: uppercase;
`;

export const UserInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const UserName = styled.div`
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeSm};
  font-weight: 600;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const UserRole = styled.div`
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeXs};
  color: rgba(255,255,255,0.45);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

// ─── Page header ──────────────────────────────────────────────────────────────

export const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 24px;
  height: 52px;
  background: white;
  border-bottom: 1px solid ${t.colorBorder};
  flex-shrink: 0;
`;

export const PageTitle = styled.h1`
  margin: 0;
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeLg};
  font-weight: 600;
  color: ${t.colorText};
`;

export const PageActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const PageBody = styled.div`
  padding: 24px;
  flex: 1;
`;
