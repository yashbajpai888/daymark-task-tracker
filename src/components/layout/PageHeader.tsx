import React from "react";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  actions,
  className = "",
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-border mb-4 sm:mb-6 ${className}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-text-primary truncate">
            {title}
          </h1>
          {badge && (
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-surface-elevated text-accent border border-border shrink-0">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs sm:text-sm text-text-secondary mt-1">{subtitle}</p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 shrink-0 w-full sm:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
};
