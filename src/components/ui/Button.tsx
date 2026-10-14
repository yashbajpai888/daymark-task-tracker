import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", loading = false, disabled, children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none select-none";

    const variantStyles = {
      primary: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 font-semibold shadow-xs transition-colors",
      secondary: "bg-surface text-text-primary hover:bg-surface-elevated active:bg-slate-200 border border-border shadow-xs transition-colors",
      danger: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 active:bg-red-200 transition-colors",
      ghost: "text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors",
    };

    const sizeStyles = {
      sm: "min-h-[36px] h-9 px-3 text-xs rounded-md gap-1.5",
      md: "min-h-[44px] h-11 px-4 text-sm rounded-lg gap-2", // 44px min touch target
      lg: "min-h-[48px] h-12 px-6 text-base rounded-lg gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
