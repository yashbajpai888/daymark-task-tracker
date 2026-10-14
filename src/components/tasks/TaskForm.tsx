"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { TaskItem, Category, Priority, Subtask } from "@/types";
import { taskSchema } from "@/lib/validation/schemas";
import { Plus, Trash2 } from "lucide-react";

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<TaskItem, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  initialTask?: TaskItem | null;
  defaultDate: string;
  categories: Category[];
}

export const TaskForm: React.FC<TaskFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialTask,
  defaultDate,
  categories,
}) => {
  const [title, setTitle] = useState(() => initialTask?.title || "");
  const [description, setDescription] = useState(() => initialTask?.description || "");
  const [date, setDate] = useState(() => initialTask?.date || defaultDate);
  const [priority, setPriority] = useState<Priority>(() => initialTask?.priority || "medium");
  const [categoryId, setCategoryId] = useState<string>(
    () => initialTask?.categoryId || categories[0]?.id || categories[0]?.slug || ""
  );
  const [dueTime, setDueTime] = useState(() => initialTask?.dueTime || "");
  const [hasTarget, setHasTarget] = useState(() => Boolean(initialTask?.target));
  const [targetValue, setTargetValue] = useState<number>(
    () => initialTask?.target?.value || 1
  );
  const [targetUnit, setTargetUnit] = useState(
    () => initialTask?.target?.unit || "glasses"
  );
  const [subtasks, setSubtasks] = useState<Subtask[]>(
    () => initialTask?.subtasks || []
  );
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks([
      ...subtasks,
      {
        id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        title: newSubtaskTitle.trim(),
        isCompleted: false,
      },
    ]);
    setNewSubtaskTitle("");
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter((s) => s.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const taskPayload = {
      title,
      description: description || undefined,
      date,
      timeZone: "Asia/Kolkata",
      status: initialTask ? initialTask.status : ("todo" as const),
      priority,
      categoryId: categoryId || undefined,
      dueTime: dueTime || undefined,
      target: hasTarget
        ? {
            value: Number(targetValue),
            unit: targetUnit,
            progress: initialTask?.target?.progress || 0,
          }
        : undefined,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
      origin: initialTask ? initialTask.origin : ("manual" as const),
    };

    const validation = taskSchema.safeParse(taskPayload);
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || "Invalid input");
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(taskPayload);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={initialTask ? "Edit Task" : "New Task"}
      description="Organize your responsibilities for today or a specific date."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs rounded-lg border border-danger/30 bg-danger/10 text-danger">
            {error}
          </div>
        )}

        <Input
          label="Title *"
          placeholder="e.g., Complete project review"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-secondary select-none">
            Notes / Description
          </label>
          <textarea
            rows={2}
            className="w-full p-3 bg-surface text-text-primary placeholder:text-text-secondary/50 border border-border focus:border-accent rounded-lg text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="Optional context, links, or details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <Input
            label="Due Time (Optional)"
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full min-h-[44px] px-3 bg-surface text-text-primary border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full min-h-[44px] px-3 bg-surface text-text-primary border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id || c.slug} value={c.id || c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Measurable Target Toggle */}
        <div className="pt-2 border-t border-border">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text-primary">
            <input
              type="checkbox"
              checked={hasTarget}
              onChange={(e) => setHasTarget(e.target.checked)}
              className="rounded border-border accent-accent w-4 h-4"
            />
            <span>Track measurable target (e.g. 8 glasses of water)</span>
          </label>

          {hasTarget && (
            <div className="grid grid-cols-2 gap-3 mt-3 pl-6">
              <Input
                label="Target Goal"
                type="number"
                min={1}
                value={targetValue}
                onChange={(e) => setTargetValue(Number(e.target.value))}
              />
              <Input
                label="Unit Name"
                placeholder="e.g. glasses, km, pages"
                value={targetUnit}
                onChange={(e) => setTargetUnit(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Subtasks Section */}
        <div className="pt-2 border-t border-border space-y-2">
          <label className="text-xs font-medium text-text-secondary">Subtasks</label>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Add a step..."
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSubtask();
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleAddSubtask}
              disabled={!newSubtaskTitle.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {subtasks.length > 0 && (
            <div className="space-y-1.5 mt-2">
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between p-2 rounded bg-surface-elevated/40 text-xs border border-border/40"
                >
                  <span className="text-text-primary truncate">{st.title}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(st.id)}
                    className="text-text-secondary hover:text-danger p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            {initialTask ? "Save Changes" : "Create Task"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
