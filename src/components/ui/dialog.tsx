"use client";
import React from "react";
import { Button } from "./button";
import * as RadixDialog from "@radix-ui/react-dialog";
import styled, { keyframes } from "styled-components";
import { X } from "lucide-react";
import { tokens as t } from "./tokens";

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeIn  = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const fadeOut = keyframes`from { opacity: 1; } to { opacity: 0; }`;
const slideIn = keyframes`from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); }`;
const slideOut= keyframes`from { opacity: 1; transform: translate(-50%, -50%) scale(1); } to { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }`;

// ─── Overlay ──────────────────────────────────────────────────────────────────

const Overlay = styled(RadixDialog.Overlay)`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(9, 30, 66, 0.54);

  &[data-state="open"]  { animation: ${fadeIn}  200ms ${t.ease}; }
  &[data-state="closed"]{ animation: ${fadeOut} 150ms ${t.ease}; }
`;

// ─── Content ──────────────────────────────────────────────────────────────────

const sizeMap = {
  xs:      "380px",
  sm:      "480px",
  default: "560px",
  lg:      "768px",
  xl:      "1024px",
};

const Content = styled(RadixDialog.Content)<{ $size?: keyof typeof sizeMap }>`
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: 1001;
  width: calc(100vw - 32px);
  max-width: ${(p) => sizeMap[p.$size ?? "default"]};
  background: white;
  border-radius: ${t.radiusLg};
  border: 1px solid ${t.colorBorder};
  box-shadow: ${t.shadowOverlay};
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 64px);
  overflow: hidden;

  &[data-state="open"]  { animation: ${slideIn}  200ms ${t.ease}; }
  &[data-state="closed"]{ animation: ${slideOut} 150ms ${t.ease}; }
`;

// ─── Header ───────────────────────────────────────────────────────────────────

const HeaderEl = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 24px 16px;
  border-bottom: 1px solid ${t.colorBorder};
  flex-shrink: 0;
`;

const TitleEl = styled(RadixDialog.Title)`
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeLg};
  font-weight: 600;
  color: ${t.colorText};
  margin: 0;
  line-height: 1.3;
`;

const DescriptionEl = styled(RadixDialog.Description)`
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeMd};
  color: ${t.colorTextSubtle};
  margin: 4px 0 0;
`;

const CloseBtn = styled(RadixDialog.Close)`
  all: unset;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: ${t.radiusMd};
  color: ${t.colorTextSubtle};
  cursor: pointer;
  flex-shrink: 0;
  margin-top: -2px;
  transition: background ${t.durationFast}, color ${t.durationFast};

  &:hover { background: ${t.colorBgNeutralHovered}; color: ${t.colorText}; }
  &:focus-visible { outline: 2px solid ${t.colorBorderFocused}; }

  svg { width: 16px; height: 16px; }
`;

// ─── Body ─────────────────────────────────────────────────────────────────────

const BodyEl = styled.div`
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
`;

// ─── Footer ───────────────────────────────────────────────────────────────────

const FooterEl = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 24px;
  border-top: 1px solid ${t.colorBorder};
  background: ${t.colorBgNeutral};
  flex-shrink: 0;
  border-radius: 0 0 ${t.radiusLg} ${t.radiusLg};
`;

// ─── Public API ───────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  size?: keyof typeof sizeMap;
  hideClose?: boolean;
  children: React.ReactNode;
}

export function Modal({ open, onOpenChange, title, description, size, hideClose, children }: ModalProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <Overlay />
        <Content $size={size}>
          {(title || !hideClose) && (
            <HeaderEl>
              <div>
                {title && <TitleEl>{title}</TitleEl>}
                {description && <DescriptionEl>{description}</DescriptionEl>}
              </div>
              {!hideClose && (
                <CloseBtn aria-label="Đóng"><X /></CloseBtn>
              )}
            </HeaderEl>
          )}
          {children}
        </Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export const ModalBody   = BodyEl;
export const ModalFooter = FooterEl;

// Re-export trigger
export const ModalTrigger = RadixDialog.Trigger;

// ─── Confirm dialog helper ────────────────────────────────────────────────────

interface ConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  appearance?: "danger" | "primary" | "warning";
  onConfirm: () => void;
  children?: React.ReactNode;
}

export function ConfirmModal({
  open, onOpenChange, title, description,
  confirmLabel = "Xác nhận", cancelLabel = "Hủy",
  appearance = "primary", onConfirm, children,
}: ConfirmProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={description} size="xs">
      {children && <ModalBody>{children}</ModalBody>}
      <ModalFooter>
        <Button appearance="subtle" onClick={() => onOpenChange(false)}>{cancelLabel}</Button>
        <Button
          appearance={appearance}
          onClick={() => { onConfirm(); onOpenChange(false); }}
        >
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
