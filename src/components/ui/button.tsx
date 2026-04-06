import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base
  [
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap",
    "font-medium leading-none select-none cursor-pointer",
    "border border-transparent rounded-sm",
    "transition-colors duration-fast",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focused)] focus-visible:ring-offset-1",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "[&_svg]:shrink-0 [&_svg]:pointer-events-none",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary — blue bold background
        primary: [
          "bg-[var(--color-brand-bold)] text-white border-transparent",
          "hover:bg-[var(--color-brand-bold-hovered)]",
          "active:bg-[var(--color-brand-bold-pressed)]",
          "disabled:bg-[var(--color-brand-bold)] disabled:opacity-40",
        ].join(" "),

        // Default / Subtle — neutral background
        default: [
          "bg-[var(--color-bg-neutral)] text-[var(--color-text)]",
          "hover:bg-[var(--color-bg-neutral-hovered)]",
          "active:bg-[var(--color-bg-neutral-pressed)]",
        ].join(" "),

        // Outline
        outline: [
          "bg-transparent text-[var(--color-text)] border-[var(--color-border)]",
          "hover:bg-[var(--color-bg-neutral-hovered)]",
          "active:bg-[var(--color-bg-neutral-pressed)]",
        ].join(" "),

        // Warning
        warning: [
          "bg-[var(--color-warning-bold)] text-white border-transparent",
          "hover:bg-[var(--color-warning-bold-hovered)]",
          "active:brightness-90",
        ].join(" "),

        // Danger
        danger: [
          "bg-[var(--color-danger-bold)] text-white border-transparent",
          "hover:bg-[var(--color-danger-bold-hovered)]",
          "active:bg-[var(--color-danger-bold-pressed)]",
        ].join(" "),

        // Subtle danger (outline style)
        "danger-subtle": [
          "bg-transparent text-[var(--color-text-danger)] border-transparent",
          "hover:bg-[var(--color-danger-subtlest)]",
          "active:bg-[var(--color-danger-subtle)]",
        ].join(" "),

        // Discovery / Purple
        discovery: [
          "bg-[var(--color-discovery-bold)] text-white border-transparent",
          "hover:brightness-90",
        ].join(" "),

        // Link
        link: [
          "bg-transparent text-[var(--color-text-brand)] border-transparent underline-offset-4",
          "hover:text-[var(--color-brand-bold-hovered)] hover:underline",
          "active:text-[var(--color-brand-bold-pressed)]",
        ].join(" "),

        // Ghost
        ghost: [
          "bg-transparent text-[var(--color-text)] border-transparent",
          "hover:bg-[var(--color-bg-neutral-hovered)]",
          "active:bg-[var(--color-bg-neutral-pressed)]",
        ].join(" "),
      },

      size: {
        xs:      "h-6  px-2   text-xs  gap-1   [&_svg]:size-3",
        sm:      "h-7  px-2.5 text-xs  gap-1   [&_svg]:size-3.5",
        default: "h-8  px-3   text-sm  gap-1.5 [&_svg]:size-4",
        lg:      "h-10 px-4   text-base gap-2  [&_svg]:size-4",
        // Icon-only variants
        "icon-xs":  "h-6 w-6  p-0 [&_svg]:size-3.5",
        "icon-sm":  "h-7 w-7  p-0 [&_svg]:size-4",
        "icon":     "h-8 w-8  p-0 [&_svg]:size-4",
        "icon-lg":  "h-10 w-10 p-0 [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
