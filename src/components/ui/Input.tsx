import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, hint, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-text-secondary select-none">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full min-h-[44px] h-11 px-3.5 bg-surface text-text-primary placeholder:text-text-secondary/50 border ${
            error ? "border-danger focus:ring-danger" : "border-border focus:border-accent"
          } rounded-lg text-base sm:text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:bg-surface-elevated/40 ${className}`}
          {...props}
        />
        {error ? (
          <span className="text-xs text-danger font-medium">{error}</span>
        ) : hint ? (
          <span className="text-xs text-text-secondary">{hint}</span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
