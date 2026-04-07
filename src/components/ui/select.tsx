"use client"
import React from "react"
import * as RadixSelect from "@radix-ui/react-select"
import styled from "styled-components"
import { ChevronDown, Check } from "lucide-react"
import { tokens as t } from "./tokens"

// ─── Trigger ─────────────────────────────────────────────────────────────────

const Trigger = styled(RadixSelect.Trigger)<{
  compact?: boolean
  $invalid?: boolean
}>`
  all: unset;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
  height: ${(p) => (p.compact ? "28px" : "32px")};
  padding: 0 10px;
  border-radius: ${t.radiusMd};
  border: 2px solid
    ${(p) => (p.$invalid ? t.colorBorderDanger : t.colorBorderInput)};
  background: ${t.colorBgInput};
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeMd};
  color: ${t.colorText};
  cursor: pointer;
  box-sizing: border-box;
  transition:
    border-color ${t.durationFast},
    background ${t.durationFast};

  &[data-placeholder] {
    color: ${t.colorTextSubtlest};
  }

  &:hover {
    background: ${t.colorBgNeutral};
    border-color: ${t.colorBorderInputHovered};
  }

  &:focus {
    border-color: ${t.colorBorderFocused};
    box-shadow: 0 0 0 2px ${t.colorBrandSubtlest};
  }

  &[data-disabled] {
    opacity: 0.6;
    cursor: not-allowed;
  }

  svg {
    width: 14px;
    height: 14px;
    color: ${t.colorTextSubtle};
    flex-shrink: 0;
  }
`

// ─── Content / Dropdown ───────────────────────────────────────────────────────

const Content = styled(RadixSelect.Content)`
  overflow: hidden;
  background: white;
  border-radius: ${t.radiusLg};
  border: 1px solid ${t.colorBorder};
  box-shadow: ${t.shadowOverlay};
  z-index: 100;
  min-width: var(--radix-select-trigger-width);
  max-height: 280px;
`

const Viewport = styled(RadixSelect.Viewport)`
  padding: 4px;
`

// ─── Item ─────────────────────────────────────────────────────────────────────

const Item = styled(RadixSelect.Item)`
  all: unset;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px 6px 28px;
  border-radius: ${t.radiusSm};
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeMd};
  color: ${t.colorText};
  cursor: pointer;
  position: relative;
  transition: background ${t.durationFast};

  &[data-highlighted] {
    background: ${t.colorBgNeutralHovered};
  }
  &[data-state="checked"] {
    color: ${t.colorTextBrand};
    background: ${t.colorBgSelected};
  }
  &[data-disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const ItemIndicator = styled(RadixSelect.ItemIndicator)`
  position: absolute;
  left: 8px;
  display: flex;
  align-items: center;
  color: ${t.colorBrandBold};
  svg {
    width: 14px;
    height: 14px;
  }
`

const GroupLabel = styled(RadixSelect.Label)`
  padding: 6px 8px 2px;
  font-size: ${t.fontSizeXs};
  font-weight: 600;
  color: ${t.colorTextSubtlest};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`

export const SelectSeparator = styled(RadixSelect.Separator)`
  height: 1px;
  background: ${t.colorBorder};
  margin: 4px 0;
`

// ─── Public API ───────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectOptionGroup {
  label: string
  options: SelectOption[]
}

interface SelectProps {
  options: SelectOption[] | SelectOptionGroup[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  isInvalid?: boolean
  compact?: boolean
  defaultValue?: string
}

// Radix không cho phép value="", dùng sentinel thay thế
const EMPTY_SENTINEL = "__empty__"

function toRadix(v: string | undefined) { return v === "" ? EMPTY_SENTINEL : (v ?? "") }
function fromRadix(v: string) { return v === EMPTY_SENTINEL ? "" : v }
function optValue(v: string)  { return v === "" ? EMPTY_SENTINEL : v }

function isGrouped(
  opts: SelectOption[] | SelectOptionGroup[],
): opts is SelectOptionGroup[] {
  return opts.length > 0 && "options" in opts[0]
}

export function Select({
  options,
  value,
  onChange,
  placeholder = "Chọn...",
  disabled,
  isInvalid,
  compact,
  defaultValue,
}: SelectProps) {
  const radixValue = toRadix(value)
  const radixDefault = defaultValue !== undefined ? toRadix(defaultValue) : undefined

  const renderItem = (opt: SelectOption) => (
    <Item key={opt.value} value={optValue(opt.value)} disabled={opt.disabled}>
      <ItemIndicator><Check /></ItemIndicator>
      <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
    </Item>
  )

  return (
    <RadixSelect.Root
      value={radixValue || undefined}
      onValueChange={(v) => onChange?.(fromRadix(v))}
      disabled={disabled}
      defaultValue={radixDefault}
    >
      <Trigger compact={compact} $invalid={isInvalid}>
        <RadixSelect.Value placeholder={placeholder} />
        <ChevronDown />
      </Trigger>

      <RadixSelect.Portal>
        <Content position="popper" sideOffset={4}>
          <Viewport>
            {isGrouped(options)
              ? options.map((group) => (
                  <RadixSelect.Group key={group.label}>
                    <GroupLabel>{group.label}</GroupLabel>
                    {group.options.map(renderItem)}
                  </RadixSelect.Group>
                ))
              : (options as SelectOption[]).map(renderItem)
            }
          </Viewport>
        </Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
}
