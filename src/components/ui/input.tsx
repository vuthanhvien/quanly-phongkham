"use client";
import React from "react";
import styled, { css } from "styled-components";
import { tokens as t } from "./tokens";

// ─── Base input ───────────────────────────────────────────────────────────────

interface InputBaseProps {
  isInvalid?: boolean;
  isDisabled?: boolean;
  compact?: boolean;
}

const inputBase = css<InputBaseProps>`
  width: 100%;
  height: ${(p) => p.compact ? "28px" : "32px"};
  padding: 0 10px;
  border-radius: ${t.radiusMd};
  border: 2px solid ${(p) => p.isInvalid ? t.colorBorderDanger : t.colorBorderInput};
  background: ${t.colorBgInput};
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeMd};
  color: ${t.colorText};
  outline: none;
  transition: border-color ${t.durationFast}, box-shadow ${t.durationFast};
  box-sizing: border-box;

  &::placeholder {
    color: ${t.colorTextSubtlest};
  }

  &:hover:not(:disabled):not(:focus) {
    border-color: ${(p) => p.isInvalid ? t.colorBorderDanger : t.colorBorderInputHovered};
    background: ${t.colorBgNeutral};
  }

  &:focus {
    border-color: ${t.colorBorderFocused};
    box-shadow: 0 0 0 2px ${t.colorBrandSubtlest};
  }

  &:disabled {
    background: ${t.colorBgNeutral};
    color: ${t.colorTextDisabled};
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

export const Input = styled.input<InputBaseProps>`${inputBase}`;
export const Textarea = styled.textarea<InputBaseProps>`
  ${inputBase}
  height: auto;
  padding: 8px 10px;
  resize: vertical;
  min-height: 80px;
  line-height: 1.5;
`;

// ─── Input with icon(s) ───────────────────────────────────────────────────────

const InputWrapper = styled.div<{ compact?: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: ${(p) => p.compact ? "28px" : "32px"};
`;

const IconSlot = styled.span<{ side: "left" | "right" }>`
  position: absolute;
  ${(p) => p.side}: 10px;
  display: flex;
  align-items: center;
  color: ${t.colorTextSubtlest};
  pointer-events: none;
  svg { width: 14px; height: 14px; }
`;

const InputWithIcon = styled(Input)<{ hasLeft?: boolean; hasRight?: boolean }>`
  padding-left:  ${(p) => p.hasLeft  ? "32px" : "10px"};
  padding-right: ${(p) => p.hasRight ? "32px" : "10px"};
`;

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  iconBefore?: React.ReactNode;
  iconAfter?: React.ReactNode;
  isInvalid?: boolean;
  compact?: boolean;
}

export function TextField({ iconBefore, iconAfter, compact, isInvalid, ...props }: TextFieldProps) {
  if (!iconBefore && !iconAfter) {
    return <Input compact={compact} isInvalid={isInvalid} {...props} />;
  }
  return (
    <InputWrapper compact={compact}>
      {iconBefore && <IconSlot side="left">{iconBefore}</IconSlot>}
      <InputWithIcon
        hasLeft={!!iconBefore}
        hasRight={!!iconAfter}
        compact={compact}
        isInvalid={isInvalid}
        style={{ height: "100%" }}
        {...props}
      />
      {iconAfter && <IconSlot side="right">{iconAfter}</IconSlot>}
    </InputWrapper>
  );
}

// ─── Label ────────────────────────────────────────────────────────────────────

export const Label = styled.label`
  display: block;
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeSm};
  font-weight: 600;
  color: ${t.colorText};
  margin-bottom: 4px;
`;

// ─── Helper / Error text ──────────────────────────────────────────────────────

export const HelperMessage = styled.p`
  margin: 4px 0 0;
  font-size: ${t.fontSizeSm};
  color: ${t.colorTextSubtle};
`;

export const ErrorMessage = styled.p`
  margin: 4px 0 0;
  font-size: ${t.fontSizeSm};
  color: ${t.colorTextDanger};
`;

// ─── Field (Label + Input + Help/Error) ──────────────────────────────────────

const FieldWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

interface FieldProps {
  label?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function Field({ label, required, hint, error, children, style, className }: FieldProps) {
  return (
    <FieldWrapper style={style} className={className}>
      {label && (
        <Label>
          {label}
          {required && <span style={{ color: t.colorTextDanger, marginLeft: 2 }}>*</span>}
        </Label>
      )}
      {children}
      {error ? <ErrorMessage>{error}</ErrorMessage> : hint ? <HelperMessage>{hint}</HelperMessage> : null}
    </FieldWrapper>
  );
}
