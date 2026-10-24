"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CustomReminder, CustomReminderCategory, ReminderRepeatType } from "@/types";
import { customReminderSchema } from "@/lib/validation/schemas";
import { PRESET_REMINDERS } from "@/lib/reminders/customReminderService";
import { Dumbbell, Footprints, Droplet, Sparkles, Clock, Calendar } from "lucide-react";

interface CustomReminderModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<CustomReminder, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  initialReminder?: CustomReminder | null;
  timeZone?: string;
}

export const CustomReminderModal: React.FC<CustomReminderModalProps> = ({
  open,
  onClose,
  onSubmit,
  initialReminder,
  timeZone = "Asia/Kolkata",
}) => {
  const [title, setTitle] = useState(() => initialReminder?.title || "");
  const [description, setDescription] = useState(() => initialReminder?.description || "");
  const [category, setCategory] = useState<CustomReminderCategory>(
    () => initialReminder?.category || "custom"
  );
  const [reminderTime, setReminderTime] = useState(() => initialReminder?.reminderTime || "08:00");
  const [repeatType, setRepeatType] = useState<ReminderRepeatType>(
    () => initialReminder?.repeatType || "daily"
  );
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>(
    () => initialReminder?.weekdays || [1, 2, 3, 4, 5]
  );
  const [intervalMinutes, setIntervalMinutes] = useState<number>(
    () => initialReminder?.intervalMinutes || 120
  );
  const [enabled, setEnabled] = useState(() => initialReminder?.enabled ?? true);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const applyPreset = (preset: (typeof PRESET_REMINDERS)[0]) => {
    setTitle(preset.title);
    setDescription(preset.description || "");
    setCategory(preset.category);
    setReminderTime(preset.reminderTime);
    setRepeatType(preset.repeatType);
    if (preset.intervalMinutes) setIntervalMinutes(preset.intervalMinutes);
  };

  const toggleWeekday = (day: number) => {
    if (selectedWeekdays.includes(day)) {
      if (selectedWeekdays.length > 1) {
        setSelectedWeekdays(selectedWeekdays.filter((d) => d !== day));
      }
    } else {
      setSelectedWeekdays([...selectedWeekdays, day].sort());
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
      category,
      reminderTime,
      repeatType,
      weekdays: repeatType === "selected-weekdays" ? selectedWeekdays : undefined,
      intervalMinutes: repeatType === "interval" ? Number(intervalMinutes) : undefined,
      enabled,
      timeZone,
    };

    const validation = customReminderSchema.safeParse(payload);
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || "Invalid reminder settings");
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(payload);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving reminder";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={initialReminder ? "Edit Custom Reminder" : "New Custom Reminder"}
      description="Configure Web Push notifications for habits like gym, running, hydration, or daily routines."
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Preset quick autofill pills */}
        {!initialReminder && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block">
              Quick Habit Presets
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applyPreset(PRESET_REMINDERS[0])}
                className="flex items-center justify-center gap-1.5 p-2 rounded-lg border border-border bg-surface-elevated/40 hover:bg-surface-elevated text-xs font-medium text-text-primary transition-colors text-center min-h-[36px]"
              >
                <Dumbbell className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>Gym (7 AM)</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset(PRESET_REMINDERS[1])}
                className="flex items-center justify-center gap-1.5 p-2 rounded-lg border border-border bg-surface-elevated/40 hover:bg-surface-elevated text-xs font-medium text-text-primary transition-colors text-center min-h-[36px]"
              >
                <Footprints className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Running</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset(PRESET_REMINDERS[2])}
                className="flex items-center justify-center gap-1.5 p-2 rounded-lg border border-border bg-surface-elevated/40 hover:bg-surface-elevated text-xs font-medium text-text-primary transition-colors text-center min-h-[36px]"
              >
                <Droplet className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Water</span>
              </button>
            </div>
          </div>
        )}

        <Input
          label="Reminder Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Morning gym workout, Drink water"
          required
        />

        <div className="space-y-1">
          <label className="text-xs font-semibold text-text-primary">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CustomReminderCategory)}
            className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-border bg-surface text-text-primary text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="gym">Gym / Training</option>
            <option value="running">Running / Cardio</option>
            <option value="water">Hydration / Water</option>
            <option value="habit">Habit Routine</option>
            <option value="task">Task Focus</option>
            <option value="custom">General Custom</option>
          </select>
        </div>

        <Input
          label="Notification Message / Body"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Time to hit your training goals and stay strong."
          hint="Short description shown in the push notification."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Reminder Time (HH:mm)"
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            required
          />

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-primary">Repeat Frequency</label>
            <select
              value={repeatType}
              onChange={(e) => setRepeatType(e.target.value as ReminderRepeatType)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-border bg-surface text-text-primary text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="daily">Every Day</option>
              <option value="selected-weekdays">Selected Weekdays</option>
              <option value="interval">Repeating Interval (Hours)</option>
              <option value="once">One-Time</option>
            </select>
          </div>
        </div>

        {/* Selected Weekdays selector */}
        {repeatType === "selected-weekdays" && (
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-semibold text-text-primary">Active Days</label>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {weekdaysList.map((day) => {
                const active = selectedWeekdays.includes(day.val);
                return (
                  <button
                    key={day.val}
                    type="button"
                    onClick={() => toggleWeekday(day.val)}
                    className={`flex-1 min-w-[32px] py-2 text-xs font-semibold rounded-md border transition-colors ${
                      active
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-surface text-text-secondary border-border hover:bg-surface-elevated"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Repeating Interval input */}
        {repeatType === "interval" && (
          <div className="space-y-1 pt-1">
            <Input
              label="Interval (Minutes)"
              type="number"
              min={15}
              max={1440}
              step={15}
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(Number(e.target.value))}
              hint="e.g. 120 minutes (every 2 hours during daytime hours 8 AM - 10 PM)"
            />
          </div>
        )}

        {/* Enabled toggle */}
        <label className="flex items-center gap-2.5 pt-2 text-xs font-semibold text-text-primary cursor-pointer select-none">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4 accent-blue-600 rounded"
          />
          <span>Enable this reminder</span>
        </label>

        {error && (
          <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs">
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-3 border-t border-border">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={submitting} className="w-full sm:w-auto">
            {initialReminder ? "Save Changes" : "Create Reminder"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
