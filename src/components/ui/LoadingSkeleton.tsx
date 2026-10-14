import React from "react";

export const LoadingSkeleton: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div
      className={`animate-pulse bg-surface-elevated/80 rounded-md ${className}`}
      aria-hidden="true"
    />
  );
};

export const TaskRowSkeleton: React.FC = () => {
  return (
    <div className="flex items-center gap-3.5 py-3.5 px-4 rounded-lg border border-border/50 bg-surface/60">
      <div className="w-5 h-5 rounded-md bg-surface-elevated animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-surface-elevated animate-pulse rounded w-1/3" />
        <div className="h-3 bg-surface-elevated/60 animate-pulse rounded w-1/5" />
      </div>
      <div className="h-6 w-14 bg-surface-elevated animate-pulse rounded shrink-0" />
    </div>
  );
};
