import React from "react";
import { Check } from "lucide-react";

export interface CheckboxProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  id,
  checked,
  onChange,
  label,
  disabled = false,
  className = "",
}) => {
  const checkboxId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <label
      htmlFor={checkboxId}
      className={`inline-flex items-center gap-3 select-none cursor-pointer group ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
    >
      <div className="relative flex items-center justify-center min-w-[24px] min-h-[24px] w-6 h-6 rounded-md border border-border bg-surface transition-all group-hover:border-accent/60">
        <input
          type="checkbox"
          id={checkboxId}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed w-full h-full"
        />
        <div
          className={`w-full h-full rounded-md flex items-center justify-center transition-colors ${
            checked ? "bg-blue-600 border-blue-600 text-white" : "bg-transparent"
          }`}
        >
          {checked && <Check className="w-4 h-4 stroke-[3]" />}
        </div>
      </div>
      {label && (
        <span
          className={`text-sm ${
            checked ? "text-text-secondary line-through" : "text-text-primary"
          } transition-colors`}
        >
          {label}
        </span>
      )}
    </label>
  );
};
