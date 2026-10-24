import React from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

export interface FeedbackBannerProps {
  type?: "info" | "warning" | "error" | "success";
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export const FeedbackBanner: React.FC<FeedbackBannerProps> = ({
  type = "info",
  title,
  message,
  onDismiss,
  className = "",
}) => {
  const styles = {
    info: {
      border: "border-blue-200 bg-blue-50/80 text-blue-800",
      icon: <Info className="w-4 h-4 shrink-0 text-blue-600" />,
    },
    warning: {
      border: "border-amber-200 bg-amber-50/80 text-amber-800",
      icon: <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />,
    },
    error: {
      border: "border-red-200 bg-red-50/80 text-red-800",
      icon: <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />,
    },
    success: {
      border: "border-green-200 bg-green-50/80 text-green-800",
      icon: <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />,
    },
  };

  const current = styles[type];

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-3.5 rounded-lg border text-sm ${current.border} ${className}`}
    >
      <div className="mt-0.5">{current.icon}</div>
      <div className="flex-1">
        {title && <div className="font-semibold text-text-primary mb-0.5">{title}</div>}
        <div className="text-text-primary/90 text-xs sm:text-sm">{message}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-text-secondary hover:text-text-primary flex items-center justify-center min-w-[36px] min-h-[36px] p-1 -mr-2 -mt-2 rounded-md active:bg-black/5"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
