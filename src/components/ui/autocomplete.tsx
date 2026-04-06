"use client";
import React, { useState, useRef, useEffect } from "react";
import styled, { css } from "styled-components";
import { Search, X, Check } from "lucide-react";
import { tokens as t } from "./tokens";

// ─── Styles ───────────────────────────────────────────────────────────────────

const Wrapper = styled.div`
  position: relative;
  width: 100%;
`;

const TriggerBox = styled.div<{ $open?: boolean; $invalid?: boolean; compact?: boolean; disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  height: ${(p) => p.compact ? "28px" : "32px"};
  padding: 0 10px;
  border-radius: ${t.radiusMd};
  border: 2px solid ${(p) =>
    p.$invalid ? t.colorBorderDanger :
    p.$open    ? t.colorBorderFocused :
    t.colorBorderInput};
  background: ${t.colorBgInput};
  cursor: ${(p) => p.disabled ? "not-allowed" : "text"};
  opacity: ${(p) => p.disabled ? 0.6 : 1};
  box-shadow: ${(p) => p.$open ? `0 0 0 2px ${t.colorBrandSubtlest}` : "none"};
  transition: border-color ${t.durationFast}, box-shadow ${t.durationFast};

  &:hover:not([disabled]) {
    ${(p) => !p.$open && css`
      background: ${t.colorBgNeutral};
      border-color: ${t.colorBorderInputHovered};
    `}
  }

  svg { width: 14px; height: 14px; color: ${t.colorTextSubtlest}; flex-shrink: 0; }
`;

const InlineInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeMd};
  color: ${t.colorText};
  min-width: 0;

  &::placeholder { color: ${t.colorTextSubtlest}; }
`;

const PlaceholderText = styled.span<{ $hasValue?: boolean }>`
  flex: 1;
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeMd};
  color: ${(p) => p.$hasValue ? t.colorText : t.colorTextSubtlest};
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const ClearBtn = styled.button`
  all: unset;
  display: flex;
  align-items: center;
  cursor: pointer;
  color: ${t.colorTextSubtlest};
  &:hover { color: ${t.colorText}; }
  svg { width: 12px; height: 12px; }
`;

const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 200;
  background: white;
  border: 1px solid ${t.colorBorder};
  border-radius: ${t.radiusLg};
  box-shadow: ${t.shadowOverlay};
  overflow: hidden;
  max-height: 260px;
  display: flex;
  flex-direction: column;
`;

const OptionList = styled.div`
  overflow-y: auto;
  padding: 4px;
`;

const Option = styled.div<{ $active?: boolean; $selected?: boolean; $disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: ${t.radiusSm};
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeMd};
  cursor: ${(p) => p.$disabled ? "not-allowed" : "pointer"};
  opacity: ${(p) => p.$disabled ? 0.5 : 1};
  background: ${(p) => p.$selected ? t.colorBgSelected : p.$active ? t.colorBgNeutralHovered : "transparent"};
  color: ${(p) => p.$selected ? t.colorTextBrand : t.colorText};
  transition: background ${t.durationFast};

  svg { width: 14px; height: 14px; flex-shrink: 0; color: ${t.colorBrandBold}; }
`;

const OptionLabel = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const OptionDesc = styled.span`
  font-size: ${t.fontSizeSm};
  color: ${t.colorTextSubtle};
  white-space: nowrap;
`;

const EmptyMsg = styled.div`
  padding: 24px;
  text-align: center;
  font-size: ${t.fontSizeMd};
  color: ${t.colorTextSubtle};
`;

// ─── Component ────────────────────────────────────────────────────────────────

export interface AutocompleteOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface AutocompleteProps {
  options: AutocompleteOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  isInvalid?: boolean;
  compact?: boolean;
  clearable?: boolean;
  onSearch?: (query: string) => void;
  className?: string;
}

export function Autocomplete({
  options,
  value,
  onChange,
  placeholder = "Tìm kiếm...",
  emptyMessage = "Không có kết quả",
  disabled,
  isInvalid,
  compact,
  clearable,
  onSearch,
  className,
}: AutocompleteProps) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const [activeIdx, setActive] = useState(-1);
  const wrapperRef            = useRef<HTMLDivElement>(null);
  const inputRef              = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openDropdown = () => {
    if (disabled) return;
    setOpen(true);
    setActive(-1);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const select = (opt: AutocompleteOption) => {
    if (opt.disabled) return;
    onChange?.(opt.value);
    setOpen(false);
    setQuery("");
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.("");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); select(filtered[activeIdx]); }
    if (e.key === "Escape") { setOpen(false); setQuery(""); }
  };

  return (
    <Wrapper ref={wrapperRef} className={className}>
      <TriggerBox
        $open={open}
        $invalid={isInvalid}
        compact={compact}
        disabled={disabled}
        onClick={openDropdown}
      >
        <Search />
        {open ? (
          <InlineInput
            ref={inputRef}
            placeholder={placeholder}
            value={query}
            onChange={(e) => { setQuery(e.target.value); onSearch?.(e.target.value); setActive(-1); }}
            onKeyDown={onKeyDown}
          />
        ) : (
          <PlaceholderText $hasValue={!!selected}>
            {selected?.label ?? placeholder}
          </PlaceholderText>
        )}
        {clearable && value && !open && (
          <ClearBtn type="button" onClick={clear}><X /></ClearBtn>
        )}
      </TriggerBox>

      {open && (
        <Dropdown>
          <OptionList>
            {filtered.length === 0
              ? <EmptyMsg>{emptyMessage}</EmptyMsg>
              : filtered.map((opt, i) => (
                  <Option
                    key={opt.value}
                    $active={i === activeIdx}
                    $selected={opt.value === value}
                    $disabled={opt.disabled}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => select(opt)}
                  >
                    <OptionLabel>{opt.label}</OptionLabel>
                    {opt.description && <OptionDesc>{opt.description}</OptionDesc>}
                    {opt.value === value && <Check />}
                  </Option>
                ))
            }
          </OptionList>
        </Dropdown>
      )}
    </Wrapper>
  );
}
