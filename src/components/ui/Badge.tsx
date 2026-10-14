import React from "react";
import { Priority, CategoryAccent } from "@/types";

export interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, className = "" }) => {
  const styles = {
    low: "text-accent bg-accent/10 border-accent/20",
    medium: "text-warning bg-warning/10 border-warning/20",
    high: "text-danger bg-danger/10 border-danger/20",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase rounded border ${styles[priority]} ${className}`}
    >
      {priority}
    </span>
  );
};

export interface CategoryPillProps {
  name: string;
  accent?: CategoryAccent;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export const CategoryPill: React.FC<CategoryPillProps> = ({
  name,
  accent = "neutral",
  active = false,
  onClick,
  className = "",
}) => {
  const accentColors = {
    mint: "border-blue-200 text-blue-600 bg-blue-50/60",
    warning: "border-amber-200 text-amber-700 bg-amber-50/60",
    danger: "border-red-200 text-red-600 bg-red-50/60",
    info: "border-blue-200 text-blue-600 bg-blue-50/60",
    neutral: "border-border text-text-secondary bg-surface",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
        active
          ? "bg-blue-600 text-white border-blue-600 font-semibold shadow-xs"
          : `hover:bg-surface-elevated ${accentColors[accent]}`
      } ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {name}
    </button>
  );
};
