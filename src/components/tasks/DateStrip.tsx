"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import {
  formatDisplayDate,
  getPreviousLocalDateString,
  getNextLocalDateString,
  isTodayLocal,
  getLocalDateString,
} from "@/lib/dates";

interface DateStripProps {
  currentDate: string;
  onSelectDate: (date: string) => void;
  timeZone?: string;
}

export const DateStrip: React.FC<DateStripProps> = ({
  currentDate,
  onSelectDate,
  timeZone = "Asia/Kolkata",
}) => {
  const isToday = isTodayLocal(currentDate, timeZone);
  const todayStr = getLocalDateString(timeZone);

  const handlePrev = () => {
    onSelectDate(getPreviousLocalDateString(timeZone, currentDate));
  };

  const handleNext = () => {
    onSelectDate(getNextLocalDateString(timeZone, currentDate));
  };

  const handleToday = () => {
    onSelectDate(todayStr);
  };

  return (
    <div className="flex items-center justify-between p-2.5 sm:p-3 bg-surface border border-border rounded-xl mb-6">
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={handlePrev}
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
          aria-label="Previous day"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
          aria-label="Next day"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center justify-center gap-1.5 sm:gap-2 min-w-0 flex-1 px-1 sm:px-2">
        <span className="text-xs sm:text-base font-semibold text-text-primary tracking-tight truncate text-center">
          {formatDisplayDate(currentDate)}
        </span>
        {isToday && (
          <span className="px-1.5 sm:px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-accent/20 text-accent border border-accent/30 shrink-0">
            Today
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {!isToday && (
          <button
            type="button"
            onClick={handleToday}
            className="px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg bg-surface-elevated hover:bg-border text-text-primary border border-border transition-colors shrink-0"
          >
            Today
          </button>
        )}

        <label
          htmlFor="date-picker-input"
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated cursor-pointer transition-colors relative min-w-[40px] min-h-[40px] flex items-center justify-center"
          title="Pick a date"
        >
          <CalendarIcon className="w-4 h-4" />
          <input
            id="date-picker-input"
            type="date"
            value={currentDate}
            onChange={(e) => e.target.value && onSelectDate(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </label>
      </div>
    </div>
  );
};
