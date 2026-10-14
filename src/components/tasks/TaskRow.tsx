"use client";

import React, { useState } from "react";
import { TaskItem, Category } from "@/types";
import { Checkbox } from "@/components/ui/Checkbox";
import { PriorityBadge } from "@/components/ui/Badge";
import { Clock, CheckSquare, MoreVertical, Trash2, Ban, Edit3, ChevronDown, ChevronUp } from "lucide-react";
import { formatTimeDisplay } from "@/lib/dates";

interface TaskRowProps {
  task: TaskItem;
  category?: Category;
  onToggleStatus: (task: TaskItem) => void;
  onCancelTask?: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: TaskItem) => void;
  onUpdateTargetProgress?: (taskId: string, progress: number) => void;
  onUpdateSubtasks?: (taskId: string, subtasks: TaskItem["subtasks"]) => void;
}

export const TaskRow: React.FC<TaskRowProps> = ({
  task,
  category,
  onToggleStatus,
  onCancelTask,
  onDeleteTask,
  onEditTask,
  onUpdateTargetProgress,
  onUpdateSubtasks,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [subtasksOpen, setSubtasksOpen] = useState(false);
  const isCompleted = task.status === "completed";
  const isCancelled = task.status === "cancelled";

  const completedSubtasks = task.subtasks?.filter((s) => s.isCompleted).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  const handleToggleSubtask = (subtaskId: string) => {
    if (!task.subtasks || !onUpdateSubtasks) return;
    const updated = task.subtasks.map((s) =>
      s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s
    );
    onUpdateSubtasks(task.id, updated);
  };

  return (
    <div
      className={`group relative flex flex-col p-3.5 sm:p-4 rounded-xl border transition-all ${
        isCompleted
          ? "bg-surface/40 border-border/40 opacity-75"
          : isCancelled
          ? "bg-surface/20 border-danger/20 opacity-60"
          : "bg-surface border-border hover:border-border/80 hover:bg-surface-elevated/20"
      }`}
    >
      <div className="flex items-start gap-3.5">
        {/* Main Checkbox */}
        <div className="pt-0.5">
          <Checkbox
            checked={isCompleted}
            disabled={isCancelled}
            onChange={() => onToggleStatus(task)}
            aria-label={`Mark "${task.title}" as ${isCompleted ? "incomplete" : "complete"}`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-sm sm:text-base font-medium break-words ${
                isCompleted
                  ? "line-through text-text-secondary"
                  : isCancelled
                  ? "line-through text-danger/80"
                  : "text-text-primary"
              }`}
            >
              {task.title}
            </span>

            {task.origin === "carry-forward" && (
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-warning/15 text-warning border border-warning/30">
                Carried forward
              </span>
            )}

            {isCancelled && (
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-danger/15 text-danger border border-danger/30">
                Cancelled
              </span>
            )}
          </div>

          {task.description && (
            <p className="text-xs text-text-secondary mt-1 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Metadata chips */}
          <div className="flex items-center gap-2 sm:gap-3 mt-2 flex-wrap text-xs text-text-secondary">
            <PriorityBadge priority={task.priority} />

            {category && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-surface-elevated text-text-secondary border border-border">
                <span className="w-1.5 h-1.5 rounded-full bg-accent/80" />
                {category.name}
              </span>
            )}

            {task.dueTime && (
              <span className="inline-flex items-center gap-1 text-[11px] text-text-secondary">
                <Clock className="w-3 h-3 text-text-secondary" />
                {formatTimeDisplay(task.dueTime)}
              </span>
            )}

            {totalSubtasks > 0 && (
              <button
                type="button"
                onClick={() => setSubtasksOpen(!subtasksOpen)}
                className="inline-flex items-center gap-1 text-[11px] text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                <CheckSquare className="w-3 h-3 text-accent" />
                <span>
                  {completedSubtasks}/{totalSubtasks}
                </span>
                {subtasksOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>

          {/* Measurable Target Stepper */}
          {task.target && (
            <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between gap-3 text-xs">
              <span className="text-text-secondary">
                Target: <strong className="text-text-primary">{task.target.progress}</strong> / {task.target.value} {task.target.unit}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={task.target.progress <= 0 || isCancelled}
                  onClick={() => onUpdateTargetProgress && onUpdateTargetProgress(task.id, Math.max(0, task.target!.progress - 1))}
                  className="px-2 py-1 rounded bg-surface-elevated hover:bg-border text-text-primary disabled:opacity-40"
                >
                  -1
                </button>
                <button
                  type="button"
                  disabled={isCancelled}
                  onClick={() => onUpdateTargetProgress && onUpdateTargetProgress(task.id, task.target!.progress + 1)}
                  className="px-2 py-1 rounded bg-accent/20 hover:bg-accent/30 text-accent font-medium disabled:opacity-40"
                >
                  +1
                </button>
              </div>
            </div>
          )}

          {/* Collapsible Subtasks */}
          {subtasksOpen && task.subtasks && task.subtasks.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-border/40 space-y-2">
              {task.subtasks.map((st) => (
                <div key={st.id} className="flex items-center gap-2.5 pl-2">
                  <Checkbox
                    checked={st.isCompleted}
                    onChange={() => handleToggleSubtask(st.id)}
                    label={st.title}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Menu Button */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
            aria-label="Task options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-8 w-36 bg-surface border border-border rounded-lg shadow-xl py-1 z-30 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onEditTask(task);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-surface-elevated text-left"
                >
                  <Edit3 className="w-3.5 h-3.5 text-text-secondary" />
                  <span>Edit</span>
                </button>

                {!isCancelled && !isCompleted && onCancelTask && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onCancelTask(task.id);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-warning hover:bg-surface-elevated text-left"
                  >
                    <Ban className="w-3.5 h-3.5 text-warning" />
                    <span>Cancel</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    if (window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
                      onDeleteTask(task.id);
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
