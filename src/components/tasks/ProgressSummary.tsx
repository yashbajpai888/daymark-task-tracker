import React from "react";

interface ProgressSummaryProps {
  completed: number;
  total: number;
  className?: string;
}

export const ProgressSummary: React.FC<ProgressSummaryProps> = ({
  completed,
  total,
  className = "",
}) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : null;

  return (
    <div
      className={`p-4 sm:p-5 rounded-xl border border-border bg-surface flex flex-col gap-3 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Daily Progress
          </span>
          <h3 className="text-lg sm:text-xl font-bold text-text-primary mt-0.5">
            {total === 0
              ? "No tasks scheduled"
              : `${completed} of ${total} completed`}
          </h3>
        </div>

        {percentage !== null && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-bold text-base sm:text-lg">
            <span>{percentage}%</span>
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/60">
          <div
            className="h-full bg-blue-600 transition-all duration-300 rounded-full"
            style={{ width: `${percentage || 0}%` }}
          />
        </div>
      )}
    </div>
  );
};
