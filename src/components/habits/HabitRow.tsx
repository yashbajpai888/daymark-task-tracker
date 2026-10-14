"use client";

import React, { useState } from "react";
import { TaskTemplate, Category } from "@/types";
import { Flame, PauseCircle, PlayCircle, MoreVertical, Edit3, Trash2 } from "lucide-react";
import { PriorityBadge } from "@/components/ui/Badge";

interface HabitRowProps {
  template: TaskTemplate;
  category?: Category;
  onToggleActive: (template: TaskTemplate) => void;
  onEdit: (template: TaskTemplate) => void;
  onDelete: (templateId: string) => void;
}

export const HabitRow: React.FC<HabitRowProps> = ({
  template,
  category,
  onToggleActive,
  onEdit,
  onDelete,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const getScheduleLabel = () => {
    const { type, weekdays } = template.recurrence;
    if (type === "daily") return "Daily";
    if (type === "selected-weekdays" && weekdays) {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return weekdays.map((d) => days[d]).join(", ");
    }
    if (type === "weekly") return "Weekly";
    return "Once";
  };

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
        template.isActive
          ? "bg-surface border-border hover:bg-surface-elevated/20"
          : "bg-surface/30 border-border/40 opacity-60"
      }`}
    >
      <div className="flex items-center gap-3.5 truncate">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
            template.isActive
              ? "bg-accent/15 border-accent/30 text-accent"
              : "bg-surface-elevated border-border text-text-secondary"
          }`}
        >
          <Flame className="w-5 h-5" />
        </div>

        <div className="truncate">
          <div className="flex items-center gap-2">
            <h4 className="text-sm sm:text-base font-semibold text-text-primary truncate">
              {template.title}
            </h4>
            {!template.isActive && (
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-elevated text-text-secondary border border-border">
                Paused
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-xs text-text-secondary mt-1 flex-wrap">
            <span className="font-medium text-text-primary/90">{getScheduleLabel()}</span>

            {category && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-surface-elevated text-text-secondary border border-border">
                {category.name}
              </span>
            )}

            {template.target && (
              <span>
                Target: {template.target.value} {template.target.unit}
              </span>
            )}

            <PriorityBadge priority={template.priority} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onToggleActive(template)}
          className={`p-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
            template.isActive
              ? "bg-surface-elevated hover:bg-border text-text-secondary border-border"
              : "bg-accent/15 hover:bg-accent/25 text-accent border-accent/30"
          }`}
          title={template.isActive ? "Pause template" : "Resume template"}
        >
          {template.isActive ? (
            <PauseCircle className="w-4 h-4" />
          ) : (
            <PlayCircle className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">
            {template.isActive ? "Pause" : "Resume"}
          </span>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
            aria-label="Habit options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-9 w-32 bg-surface border border-border rounded-lg shadow-xl py-1 z-30">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(template);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-surface-elevated text-left"
                >
                  <Edit3 className="w-3.5 h-3.5 text-text-secondary" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    if (window.confirm(`Delete habit template "${template.title}"?`)) {
                      onDelete(template.id);
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-danger hover:bg-danger/10 text-left"
                >
                  <Trash2 className="w-3.5 h-3.5 text-danger" />
                  <span>Delete</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
