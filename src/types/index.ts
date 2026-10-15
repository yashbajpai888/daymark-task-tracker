export type Priority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "completed" | "cancelled";
export type TaskOrigin = "manual" | "template" | "carry-forward";

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface TaskTarget {
  value: number;
  unit: string;
  progress: number;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD in local time
  timeZone: string;
  status: TaskStatus;
  priority: Priority;
  categoryId?: string;
  projectId?: string;
  templateId?: string;
  sourceTaskId?: string;
  carriedFromDate?: string;
  dueTime?: string; // HH:mm local time
  reminderEnabled?: boolean;
  reminderOffsetMinutes?: number;
  target?: TaskTarget;
  subtasks?: Subtask[];
  createdAt: number | string; // Unix timestamp ms or ISO string
  updatedAt: number | string;
  completedAt?: number | string | null;
  cancelledAt?: number | string | null;
  origin: TaskOrigin;
  idempotencyKey?: string;
}

export interface RecurrenceConfig {
  type: "daily" | "weekly" | "selected-weekdays" | "once";
  weekdays?: number[]; // 0=Sunday, 1=Monday, ... 6=Saturday
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  timeZone: string;
}

export interface TaskTemplate {
  id: string;
  title: string;
  description?: string;
  categoryId: string;
  priority: Priority;
  recurrence: RecurrenceConfig;
  dueTime?: string;
  target?: {
    value: number;
    unit: string;
  };
  isHabit: boolean;
  isActive: boolean;
  createdAt: number | string;
  updatedAt: number | string;
  archivedAt?: number | string | null;
}

export type CategoryAccent = "mint" | "warning" | "danger" | "info" | "neutral";

export interface Category {
  id: string;
  name: string;
  slug: string;
  kind: "built-in" | "custom";
  iconKey?: string;
  accentKey?: CategoryAccent;
  sortOrder: number;
  isArchived: boolean;
  createdAt: number | string;
  updatedAt: number | string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  status: "active" | "paused" | "completed" | "archived";
  sortOrder: number;
  createdAt: number | string;
  updatedAt: number | string;
}

export interface CarryForwardDecision {
  destinationDate: string; // YYYY-MM-DD
  sourceDate: string;
  decision: "accepted" | "declined";
  selectedSourceTaskIds: string[];
  createdAt: number | string;
}

export type CustomReminderCategory = "gym" | "running" | "water" | "task" | "habit" | "custom";
export type ReminderRepeatType = "daily" | "selected-weekdays" | "interval" | "once";

export interface CustomReminder {
  id: string;
  title: string;
  description?: string;
  category: CustomReminderCategory;
  reminderTime: string; // HH:mm local time
  repeatType: ReminderRepeatType;
  weekdays?: number[]; // 0=Sunday .. 6=Saturday
  intervalMinutes?: number; // e.g. every 60 or 120 mins for water
  enabled: boolean;
  timeZone: string;
  linkedTaskId?: string;
  linkedTemplateId?: string;
  createdAt: number | string;
  updatedAt: number | string;
}

export interface NotificationHistoryItem {
  id: string;
  title: string;
  body: string;
  category?: CustomReminderCategory | string;
  sentAt: number | string;
  read: boolean;
  linkUrl?: string;
  tag?: string;
}

export interface PushSubscriptionRecord {
  token: string;
  platform: "android" | "ios" | "desktop" | "other";
  userAgent: string;
  createdAt: number | string;
  updatedAt: number | string;
}

export interface ReminderSettings {
  enabled: boolean; // email reminder enabled flag (disabled by default)
  pushEnabled: boolean; // Web push notifications enabled
  destinationEmail: string;
  emailVerified: boolean;
  timeZone: string;
  intervalMinutes?: number;
  scheduledTimes?: string[]; // array of HH:mm
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
  };
  dailySummaryEnabled: boolean;
  dailySummaryTime?: string; // HH:mm
  maxEmailsPerDay: number;
  soundEnabled?: boolean;
  createdAt?: number | string;
  updatedAt?: number | string;
}

export interface ReminderEvent {
  id: string;
  idempotencyKey: string;
  scheduledForLocalDate: string;
  scheduledSlot: string;
  status: "pending" | "sent" | "failed" | "skipped";
  reason?: string;
  providerMessageId?: string;
  attemptCount: number;
  createdAt: number | string;
  updatedAt: number | string;
  sentAt?: number | string;
  lastErrorCode?: string;
}

export interface GenerationRun {
  date: string;
  status: "complete" | "partial" | "failed";
  templatesChecked: number;
  instancesCreated: number;
  createdAt: number | string;
  updatedAt: number | string;
}

export interface UserProfile {
  uid: string;
  displayName?: string;
  email: string;
  photoURL?: string;
  timeZone: string;
  onboardingCompleted: boolean;
  createdAt: number | string;
  updatedAt: number | string;
}

export interface UserPreferences {
  theme: "graphite-mint";
  timeZone: string;
  weekStartsOn: 0 | 1;
}

export interface DailyReportSummary {
  date: string;
  eligibleCount: number;
  completedCount: number;
  todoCount: number;
  cancelledCount: number;
  completionRate: number | null; // null represents "No tasks scheduled"
}
