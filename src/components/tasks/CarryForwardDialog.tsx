"use client";

import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { TaskItem } from "@/types";
import { formatDisplayDate } from "@/lib/dates";
import { PriorityBadge } from "@/components/ui/Badge";
import { Trash2 } from "lucide-react";

interface CarryForwardDialogProps {
  open: boolean;
  onClose: () => void;
  sourceDate: string;
  destinationDate?: string;
  eligibleTasks: TaskItem[];
  onDecide: (decision: "accepted" | "declined", selectedTaskIds: string[]) => Promise<void>;
  onDeleteTask?: (taskId: string) => Promise<void>;
}

export const CarryForwardDialog: React.FC<CarryForwardDialogProps> = ({
  open,
  onClose,
  sourceDate,
  destinationDate: _destinationDate,
  eligibleTasks,
  onDecide,
  onDeleteTask,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    eligibleTasks.map((t) => t.id)
  );
  const [processing, setProcessing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedIds(eligibleTasks.map((t) => t.id));
      setProcessing(false);
      setDeletingId(null);
    }
  }, [open, eligibleTasks]);

  const handleDeleteItem = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    if (!onDeleteTask) return;
    try {
      setDeletingId(taskId);
      await onDeleteTask(taskId);
      setSelectedIds((prev) => prev.filter((id) => id !== taskId));
    } catch (err) {
      console.error("Failed to delete task from carry forward dialog:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = (taskId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, taskId]);
    } else {
      setSelectedIds(selectedIds.filter((id) => id !== taskId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(eligibleTasks.map((t) => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleAccept = async () => {
    try {
      setProcessing(true);
      await onDecide("accepted", selectedIds);
      onClose();
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    try {
      setProcessing(true);
      await onDecide("declined", []);
      onClose();
    } finally {
      setProcessing(false);
    }
  };

  if (eligibleTasks.length === 0) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="A few tasks are still unfinished"
      description={`Uncompleted tasks from ${formatDisplayDate(sourceDate)} are eligible to be carried forward.`}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border text-xs text-text-secondary">
          <span>Select tasks to bring into today:</span>
          <button
            type="button"
            onClick={() => handleSelectAll(selectedIds.length !== eligibleTasks.length)}
            className="text-accent hover:underline font-medium"
          >
            {selectedIds.length === eligibleTasks.length ? "Deselect All" : "Select All"}
          </button>
        </div>

        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
          {eligibleTasks.map((task) => {
            const isSelected = selectedIds.includes(task.id);
            return (
              <div
                key={task.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  isSelected
                    ? "bg-surface-elevated border-accent/40"
                    : "bg-surface/50 border-border opacity-70"
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Checkbox
                    checked={isSelected}
                    onChange={(checked) => handleToggle(task.id, checked)}
                  />
                  <div className="truncate">
                    <span className="text-sm font-medium text-text-primary truncate block">
                      {task.title}
                    </span>
                    {task.dueTime && (
                      <span className="text-[11px] text-text-secondary">
                        Was due {task.dueTime}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <PriorityBadge priority={task.priority} />
                  {onDeleteTask && (
                    <button
                      type="button"
                      title="Delete task"
                      disabled={deletingId === task.id || processing}
                      onClick={(e) => handleDeleteItem(e, task.id)}
                      className="p-1.5 rounded-lg text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer disabled:opacity-50"
                      aria-label={`Delete task ${task.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-danger" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={handleDecline}
            disabled={processing}
            className="w-full sm:w-auto"
          >
            Start fresh
          </Button>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={processing}
              className="w-full sm:w-auto"
            >
              Later
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={processing}
              disabled={selectedIds.length === 0}
              onClick={handleAccept}
              className="w-full sm:w-auto"
            >
              Add {selectedIds.length} to today
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
