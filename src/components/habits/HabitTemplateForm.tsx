"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { TaskTemplate, Category, Priority } from "@/types";
import { templateSchema } from "@/lib/validation/schemas";

interface HabitTemplateFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<TaskTemplate, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  initialTemplate?: TaskTemplate | null;
  categories: Category[];
  defaultDate: string;
}

export const HabitTemplateForm: React.FC<HabitTemplateFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialTemplate,
  categories,
  defaultDate,
}) => {
  const [title, setTitle] = useState(() => initialTemplate?.title || "");
  const [description, setDescription] = useState(() => initialTemplate?.description || "");
  const [categoryId, setCategoryId] = useState(
    () => initialTemplate?.categoryId || categories.find((c) => c.slug === "habits")?.id || categories[0]?.id || ""
  );
  const [priority, setPriority] = useState<Priority>(() => initialTemplate?.priority || "medium");
  const [recurrenceType, setRecurrenceType] = useState<"daily" | "selected-weekdays" | "weekly" | "once">(
    () => initialTemplate?.recurrence.type || "daily"
  );
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>(
    () => initialTemplate?.recurrence.weekdays || [1, 2, 3, 4, 5]
  );
  const [startDate, setStartDate] = useState(() => initialTemplate?.recurrence.startDate || defaultDate);
  const [dueTime, setDueTime] = useState(() => initialTemplate?.dueTime || "");
  const [hasTarget, setHasTarget] = useState(() => Boolean(initialTemplate?.target));
  const [targetValue, setTargetValue] = useState<number>(() => initialTemplate?.target?.value || 8);
  const [targetUnit, setTargetUnit] = useState(() => initialTemplate?.target?.unit || "glasses");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const toggleWeekday = (dayIndex: number) => {
    if (selectedWeekdays.includes(dayIndex)) {
      if (selectedWeekdays.length > 1) {
        setSelectedWeekdays(selectedWeekdays.filter((d) => d !== dayIndex));
      }
    } else {
      setSelectedWeekdays([...selectedWeekdays, dayIndex].sort());
    }
  };

  const weekdaysList = [
    { label: "Su", val: 0 },
    { label: "Mo", val: 1 },
    { label: "Tu", val: 2 },
    { label: "We", val: 3 },
    { label: "Th", val: 4 },
    { label: "Fr", val: 5 },
    { label: "Sa", val: 6 },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      title,
      description: description || undefined,
      categoryId: categoryId || categories[0]?.id || "habits",
      priority,
      recurrence: {
        type: recurrenceType,
        weekdays: recurrenceType === "selected-weekdays" ? selectedWeekdays : undefined,
        startDate,
        timeZone: "Asia/Kolkata",
      },
      dueTime: dueTime || undefined,
      target: hasTarget
        ? {
            value: Number(targetValue),
            unit: targetUnit,
          }
        : undefined,
      isHabit: true,
      isActive: initialTemplate ? initialTemplate.isActive : true,
    };

    const validation = templateSchema.safeParse(payload);
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || "Invalid input");
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(payload);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={initialTemplate ? "Edit Habit Template" : "New Recurring Habit"}
      description="Create a habit once; Daymark will generate daily tasks on applicable days automatically."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs rounded-lg border border-danger/30 bg-danger/10 text-danger">
            {error}
          </div>
        )}

        <Input
          label="Habit Title *"
          placeholder="e.g., Morning Workout, Hydration, Read 20 pages"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full min-h-[44px] px-3 bg-surface text-text-primary border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {categories.map((c) => (
                <option key={c.id || c.slug} value={c.id || c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

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
        </div>

        {/* Recurrence Schedule Selector */}
        <div className="pt-2 border-t border-border space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Schedule</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRecurrenceType("daily")}
                className={`py-2 px-3 text-xs font-medium rounded-lg border transition-colors ${
                  recurrenceType === "daily"
                    ? "bg-accent/20 border-accent text-accent font-semibold"
                    : "bg-surface border-border text-text-secondary hover:text-text-primary"
                }`}
              >
                Every Day
              </button>
              <button
                type="button"
                onClick={() => setRecurrenceType("selected-weekdays")}
                className={`py-2 px-3 text-xs font-medium rounded-lg border transition-colors ${
                  recurrenceType === "selected-weekdays"
                    ? "bg-accent/20 border-accent text-accent font-semibold"
                    : "bg-surface border-border text-text-secondary hover:text-text-primary"
                }`}
              >
                Specific Days
              </button>
              <button
                type="button"
                onClick={() => setRecurrenceType("weekly")}
                className={`py-2 px-3 text-xs font-medium rounded-lg border transition-colors ${
                  recurrenceType === "weekly"
                    ? "bg-accent/20 border-accent text-accent font-semibold"
                    : "bg-surface border-border text-text-secondary hover:text-text-primary"
                }`}
              >
                Weekly
              </button>
            </div>
          </div>

          {recurrenceType === "selected-weekdays" && (
            <div className="flex items-center gap-1.5 pt-1">
              {weekdaysList.map((day) => {
                const active = selectedWeekdays.includes(day.val);
                return (
                  <button
                    key={day.val}
                    type="button"
                    onClick={() => toggleWeekday(day.val)}
                    className={`flex-1 h-9 rounded-lg text-xs font-medium border transition-colors ${
                      active
                        ? "bg-blue-600 text-white border-blue-600 font-semibold shadow-xs"
                        : "bg-surface border-border text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              label="Preferred Time (Optional)"
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
            />
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
            <span>Include target quantity (e.g. 8 glasses, 5 km, 30 mins)</span>
          </label>

          {hasTarget && (
            <div className="grid grid-cols-2 gap-3 mt-3 pl-6">
              <Input
                label="Goal Amount"
                type="number"
                min={1}
                value={targetValue}
                onChange={(e) => setTargetValue(Number(e.target.value))}
              />
              <Input
                label="Measurement Unit"
                placeholder="e.g. glasses, km, pages"
                value={targetUnit}
                onChange={(e) => setTargetUnit(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            {initialTemplate ? "Save Habit" : "Create Habit"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
