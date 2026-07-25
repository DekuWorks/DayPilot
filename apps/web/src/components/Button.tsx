"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { buttonClassName } from "@/components/button-styles";
import type { ButtonSize, ButtonVariant } from "@/components/button-styles";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={buttonClassName({ variant, size, className })}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
