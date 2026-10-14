import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required").max(200, "Title is too long (max 200 chars)"),
  description: z.string().max(2000, "Description is too long").optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (must be YYYY-MM-DD)"),
  timeZone: z.string().default("Asia/Kolkata"),
  status: z.enum(["todo", "completed", "cancelled"]).default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  categoryId: z.string().optional(),
  projectId: z.string().optional(),
  templateId: z.string().optional(),
  dueTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time format (HH:mm)").optional().or(z.literal("")),
  target: z
    .object({
      value: z.number().positive(),
      unit: z.string().min(1),
      progress: z.number().min(0),
    })
    .optional(),
  subtasks: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().trim().min(1),
        isCompleted: z.boolean(),
      })
    )
    .optional(),
});

export const templateSchema = z.object({
  title: z.string().trim().min(1, "Habit / template title is required").max(200),
  description: z.string().max(2000).optional(),
  categoryId: z.string().min(1, "Category is required"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  recurrence: z.object({
    type: z.enum(["daily", "weekly", "selected-weekdays", "once"]),
    weekdays: z.array(z.number().int().min(0).max(6)).optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    timeZone: z.string().default("Asia/Kolkata"),
  }),
  dueTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().or(z.literal("")),
  target: z
    .object({
      value: z.number().positive(),
      unit: z.string().min(1),
    })
    .optional(),
  isHabit: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export const reminderSettingsSchema = z.object({
  enabled: z.boolean().default(false), // email reminders disabled by default
  pushEnabled: z.boolean().default(false), // Web push notifications
  destinationEmail: z.string().email("Invalid destination email").optional().or(z.literal("")),
  emailVerified: z.boolean().default(false),
  timeZone: z.string().min(1, "Time zone is required"),
  intervalMinutes: z.number().int().min(15).max(1440).optional(),
  scheduledTimes: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)).optional(),
  quietHours: z
    .object({
      enabled: z.boolean(),
      start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    })
    .optional(),
  dailySummaryEnabled: z.boolean().default(true),
  dailySummaryTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("21:00"),
  maxEmailsPerDay: z.number().int().min(1).max(24).default(3),
  soundEnabled: z.boolean().default(true),
});

export const customReminderSchema = z.object({
  title: z.string().trim().min(1, "Reminder title is required").max(100),
  description: z.string().max(500).optional(),
  category: z.enum(["gym", "running", "water", "task", "habit", "custom"]).default("custom"),
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time format (HH:mm)"),
  repeatType: z.enum(["daily", "selected-weekdays", "interval", "once"]).default("daily"),
  weekdays: z.array(z.number().int().min(0).max(6)).optional(),
  intervalMinutes: z.number().int().min(15).max(1440).optional(),
  enabled: z.boolean().default(true),
  timeZone: z.string().default("Asia/Kolkata"),
  linkedTaskId: z.string().optional(),
  linkedTemplateId: z.string().optional(),
});

export const pushTokenSchema = z.object({
  token: z.string().trim().min(10, "Invalid FCM token"),
  platform: z.enum(["android", "ios", "desktop", "other"]).default("desktop"),
  userAgent: z.string().optional().default(""),
});


export const carryForwardSchema = z.object({
  destinationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sourceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  decision: z.enum(["accepted", "declined"]),
  selectedSourceTaskIds: z.array(z.string()),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(50),
  slug: z.string().trim().min(1).max(50),
  kind: z.enum(["built-in", "custom"]).default("custom"),
  iconKey: z.string().optional(),
  accentKey: z.enum(["mint", "warning", "danger", "info", "neutral"]).default("mint"),
  sortOrder: z.number().int().default(0),
  isArchived: z.boolean().default(false),
});
