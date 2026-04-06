import React from "react";
import styled from "styled-components";
import { tokens as t } from "./tokens";

// ─── Container ────────────────────────────────────────────────────────────────

export const TableContainer = styled.div`
  width: 100%;
  overflow-x: auto;
  border-radius: ${t.radiusLg};
  border: 1px solid ${t.colorBorder};
  background: white;
  box-shadow: ${t.shadowCard};
`;

// ─── Table ────────────────────────────────────────────────────────────────────

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeMd};
`;

// ─── Head ─────────────────────────────────────────────────────────────────────

export const TableHeader = styled.thead`
  border-bottom: 2px solid ${t.colorBorder};
`;

export const Th = styled.th<{ sortable?: boolean; width?: string | number }>`
  height: 36px;
  padding: 0 12px;
  text-align: left;
  font-size: ${t.fontSizeSm};
  font-weight: 600;
  color: ${t.colorTextSubtle};
  background: ${t.colorBgNeutral};
  white-space: nowrap;
  width: ${(p) => p.width != null ? (typeof p.width === "number" ? `${p.width}px` : p.width) : "auto"};
  cursor: ${(p) => p.sortable ? "pointer" : "default"};
  user-select: ${(p) => p.sortable ? "none" : "auto"};
  transition: background ${t.durationFast}, color ${t.durationFast};

  &:hover {
    ${(p) => p.sortable && `background: ${t.colorBgNeutralHovered}; color: ${t.colorText};`}
  }
`;

// ─── Body ─────────────────────────────────────────────────────────────────────

export const TableBody = styled.tbody`
  & tr + tr { border-top: 1px solid ${t.colorBorder}; }
`;

export const Tr = styled.tr<{ selected?: boolean; clickable?: boolean }>`
  background: ${(p) => p.selected ? t.colorBgSelected : "white"};
  cursor: ${(p) => p.clickable ? "pointer" : "default"};
  transition: background ${t.durationFast};

  &:hover {
    background: ${(p) => p.selected ? t.colorBgSelectedHover : t.colorBgNeutral};
  }
`;

export const Td = styled.td<{ muted?: boolean; bold?: boolean; center?: boolean }>`
  padding: 10px 12px;
  font-size: ${t.fontSizeMd};
  color: ${(p) => p.muted ? t.colorTextSubtle : t.colorText};
  font-weight: ${(p) => p.bold ? 600 : 400};
  text-align: ${(p) => p.center ? "center" : "left"};
  vertical-align: middle;
  white-space: nowrap;
`;

// ─── Footer ───────────────────────────────────────────────────────────────────

export const TableFooter = styled.tfoot`
  border-top: 2px solid ${t.colorBorder};
  background: ${t.colorBgNeutral};

  td {
    padding: 8px 12px;
    font-size: ${t.fontSizeMd};
    font-weight: 600;
    color: ${t.colorTextSubtle};
  }
`;

// ─── Empty state ──────────────────────────────────────────────────────────────

interface TableEmptyProps {
  colSpan: number;
  icon?: React.ReactNode;
  message?: string;
  action?: React.ReactNode;
}

const EmptyCell = styled.td`
  padding: 56px 24px;
  text-align: center;
`;

const EmptyInner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: ${t.colorTextSubtle};

  svg { width: 40px; height: 40px; opacity: 0.3; }
  span { font-size: ${t.fontSizeMd}; }
`;

export function TableEmpty({ colSpan, icon, message = "Không có dữ liệu", action }: TableEmptyProps) {
  return (
    <tr>
      <EmptyCell colSpan={colSpan}>
        <EmptyInner>
          {icon}
          <span>{message}</span>
          {action}
        </EmptyInner>
      </EmptyCell>
    </tr>
  );
}

// ─── Sort indicator ───────────────────────────────────────────────────────────

export function SortIcon({ direction }: { direction?: "asc" | "desc" | null }) {
  if (direction === "asc")  return <span style={{ marginLeft: 4 }}>↑</span>;
  if (direction === "desc") return <span style={{ marginLeft: 4 }}>↓</span>;
  return <span style={{ marginLeft: 4, opacity: 0.3 }}>⇅</span>;
}
