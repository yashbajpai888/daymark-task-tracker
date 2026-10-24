"use client";

import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { TaskItem, Category, Priority, Subtask } from "@/types";
import { taskSchema } from "@/lib/validation/schemas";
import { useAuth } from "@/lib/auth/AuthContext";
import { checkPushSupport, requestAndRegisterPushToken } from "@/lib/firebase/messaging";
import { Plus, Trash2, Bell, BellRing, CheckCircle2, Clock } from "lucide-react";

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
  const { getIdToken } = useAuth();

  const [title, setTitle] = useState(() => initialTask?.title || "");
  const [description, setDescription] = useState(() => initialTask?.description || "");
  const [date, setDate] = useState(() => initialTask?.date || defaultDate);
  const [priority, setPriority] = useState<Priority>(() => initialTask?.priority || "medium");
  const [categoryId, setCategoryId] = useState<string>(
    () => initialTask?.categoryId || categories[0]?.id || categories[0]?.slug || ""
  );

  // Reminder and due time state
  const [dueTime, setDueTime] = useState(() => initialTask?.dueTime || "");
  const [reminderEnabled, setReminderEnabled] = useState(
    () => Boolean(initialTask?.reminderEnabled || initialTask?.dueTime)
  );
  const [reminderOffsetMinutes, setReminderOffsetMinutes] = useState<number>(
    () => initialTask?.reminderOffsetMinutes || 0
  );
  const [permissionState, setPermissionState] = useState<NotificationPermission | "unsupported">("default");
  const [enablingNotifications, setEnablingNotifications] = useState(false);

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

  useEffect(() => {
    if (open) {
      checkPushSupport().then((info) => {
        setPermissionState(info.permission);
      });
    }
  }, [open]);

  const handleEnableNotificationsInline = async () => {
    setEnablingNotifications(true);
    try {
      const res = await requestAndRegisterPushToken(getIdToken);
      if (res.success) {
        setPermissionState("granted");
      } else {
        setError(res.error || "Please allow notifications in your browser settings.");
      }
    } catch {
      setError("Failed to register notification permissions.");
    } finally {
      setEnablingNotifications(false);
    }
  };

  const handleToggleReminder = async (checked: boolean) => {
    setReminderEnabled(checked);
    if (checked && permissionState !== "granted") {
      // Prompt synchronously on this click
      await handleEnableNotificationsInline();
    }
  };

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
      reminderEnabled: Boolean(reminderEnabled && dueTime),
      reminderOffsetMinutes: reminderEnabled ? reminderOffsetMinutes : 0,
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
            className="w-full p-3 bg-surface text-text-primary placeholder:text-text-secondary/50 border border-border focus:border-accent rounded-lg text-base sm:text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="Optional context, links, or details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full min-h-[44px] px-3 bg-surface text-text-primary border border-border rounded-lg text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-accent"
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
              className="w-full min-h-[44px] px-3 bg-surface text-text-primary border border-border rounded-lg text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-accent"
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

        {/* Integrated Push Notification & Reminder Card */}
        <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-xs font-semibold text-slate-900">Task Reminder &amp; Notification</span>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-blue-700">
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(e) => handleToggleReminder(e.target.checked)}
                className="w-4 h-4 accent-blue-600 rounded"
              />
              <span>Set Reminder</span>
            </label>
          </div>

          {reminderEnabled ? (
            <div className="space-y-3 pt-1 border-t border-blue-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Notification Time *"
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  required={reminderEnabled}
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-secondary">When to Notify</label>
                  <select
                    value={reminderOffsetMinutes}
                    onChange={(e) => setReminderOffsetMinutes(Number(e.target.value))}
                    className="w-full min-h-[44px] px-3 bg-surface text-text-primary border border-border rounded-lg text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value={0}>At exact time</option>
                    <option value={5}>5 minutes before</option>
                    <option value={15}>15 minutes before</option>
                    <option value={30}>30 minutes before</option>
                  </select>
                </div>
              </div>

              {/* Inline Permission Status & Instant Enable Button */}
              {permissionState !== "granted" ? (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-amber-900">
                    <BellRing className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Allow notifications to receive alerts on this device</span>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    loading={enablingNotifications}
                    onClick={handleEnableNotificationsInline}
                    className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 text-xs py-1.5 px-3 h-auto w-full sm:w-auto"
                  >
                    Allow Now
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Device active — notification will ring at {dueTime || "scheduled time"}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-slate-500">
              Turn on &apos;Set Reminder&apos; to receive a pop-up alert with sound on your phone or computer.
            </p>
          )}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pl-0 sm:pl-6">
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
              className="shrink-0"
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

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={submitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            className="w-full sm:w-auto"
          >
            {initialTask ? "Save Changes" : "Create Task"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
