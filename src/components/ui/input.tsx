import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Hiển thị icon bên trái */
  startIcon?: React.ReactNode;
  /** Hiển thị icon hoặc nội dung bên phải */
  endIcon?: React.ReactNode;
  /** Trạng thái lỗi */
  isInvalid?: boolean;
  /** Compact size */
  compact?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, startIcon, endIcon, isInvalid, compact, ...props }, ref) => {
    if (startIcon || endIcon) {
      return (
        <div className={cn("relative flex items-center", compact ? "h-7" : "h-8")}>
          {startIcon && (
            <span className="pointer-events-none absolute left-2.5 flex items-center text-[var(--color-text-subtlest)] [&_svg]:size-4">
              {startIcon}
            </span>
          )}
          <input
            ref={ref}
            type={type}
            className={cn(
              "peer w-full rounded-sm border bg-[var(--color-bg-input)]",
              "text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtlest)]",
              "transition-colors duration-fast outline-none",
              "focus:border-[var(--color-border-focused)] focus:ring-2 focus:ring-[var(--color-border-focused)]/30",
              "disabled:cursor-not-allowed disabled:bg-[var(--color-neutral-20)] disabled:text-[var(--color-text-disabled)]",
              compact ? "h-7 py-1" : "h-8 py-1.5",
              isInvalid
                ? "border-[var(--color-border-danger)] focus:ring-[var(--color-danger-bold)]/30"
                : "border-[var(--color-border-input)] hover:border-[var(--color-border-input-hovered)]",
              startIcon ? "pl-8.5" : "pl-2.5",
              endIcon ? "pr-8.5" : "pr-2.5",
              className
            )}
            {...props}
          />
          {endIcon && (
            <span className="pointer-events-none absolute right-2.5 flex items-center text-[var(--color-text-subtlest)] [&_svg]:size-4">
              {endIcon}
            </span>
          )}
        </div>
      );
    }

    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "w-full rounded-sm border bg-[var(--color-bg-input)]",
          "px-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtlest)]",
          "transition-colors duration-fast outline-none",
          "focus:border-[var(--color-border-focused)] focus:ring-2 focus:ring-[var(--color-border-focused)]/30",
          "disabled:cursor-not-allowed disabled:bg-[var(--color-neutral-20)] disabled:text-[var(--color-text-disabled)]",
          compact ? "h-7 py-1" : "h-8 py-1.5",
          isInvalid
            ? "border-[var(--color-border-danger)] focus:ring-[var(--color-danger-bold)]/30"
            : "border-[var(--color-border-input)] hover:border-[var(--color-border-input-hovered)]",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

// ─── Label ────────────────────────────────────────────────────────────────────

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const InputLabel = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "block text-xs font-semibold text-[var(--color-text)] mb-1",
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="ml-0.5 text-[var(--color-text-danger)]">*</span>}
    </label>
  )
);
InputLabel.displayName = "InputLabel";

// ─── Helper text ──────────────────────────────────────────────────────────────

const InputHelp = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("mt-1 text-xs text-[var(--color-text-subtle)]", className)}
      {...props}
    />
  )
);
InputHelp.displayName = "InputHelp";

const InputError = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("mt-1 text-xs text-[var(--color-text-danger)]", className)}
      {...props}
    />
  )
);
InputError.displayName = "InputError";

// ─── Field (Label + Input + Help) ─────────────────────────────────────────────

interface FieldProps {
  label?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

function Field({ label, required, hint, error, className, children }: FieldProps) {
  return (
    <div className={cn("space-y-0", className)}>
      {label && <InputLabel required={required}>{label}</InputLabel>}
      {children}
      {error ? (
        <InputError>{error}</InputError>
      ) : hint ? (
        <InputHelp>{hint}</InputHelp>
      ) : null}
    </div>
  );
}

export { Input, InputLabel, InputHelp, InputError, Field };
