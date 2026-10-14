# 05 — Firestore Database Schema

## 1. Design principles
- Scope user-owned data under the authenticated user's UID.
- Store reusable templates separately from dated task instances.
- Keep date keys in the user's local time zone.
- Use deterministic keys for daily generation and carry-forward idempotency.
- Keep the first release simple; avoid unnecessary denormalization.
- Server timestamps use Firestore Timestamp (UTC); local dates use `YYYY-MM-DD`.

## 2. Suggested collections

### `users/{uid}`
```ts
{
  displayName?: string;
  email: string;
  timeZone: string; // default "Asia/Kolkata"
  createdAt: Timestamp;
  updatedAt: Timestamp;
  onboardingCompleted: boolean;
}
```

### `users/{uid}/settings/preferences`
```ts
{
  theme: "graphite-mint";
  timeZone: string; // IANA identifier
  weekStartsOn: 0 | 1; // Sunday or Monday
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `users/{uid}/categories/{categoryId}`
```ts
{
  name: string;
  slug: string;
  kind: "built-in" | "custom";
  iconKey?: string; // allow-listed Lucide icon key only
  accentKey?: "mint" | "warning" | "danger" | "info" | "neutral";
  sortOrder: number;
  isArchived: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```
Built-in categories should be seeded safely and protected from destructive operations that would break navigation.

### `users/{uid}/taskTemplates/{templateId}`
```ts
{
  title: string;
  description?: string;
  categoryId: string;
  priority: "low" | "medium" | "high";
  recurrence: {
    type: "daily" | "weekly" | "selected-weekdays" | "once";
    weekdays?: number[]; // define consistently, e.g. 0=Sunday ... 6=Saturday
    startDate: string; // YYYY-MM-DD local date
    endDate?: string;
    timeZone: string;
  };
  dueTime?: string; // HH:mm local time
  target?: {
    value: number;
    unit: string;
  };
  isHabit: boolean;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  archivedAt?: Timestamp;
}
```

### `users/{uid}/tasks/{taskId}`
```ts
{
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD in user's time zone
  timeZone: string;
  status: "todo" | "completed" | "cancelled";
  priority: "low" | "medium" | "high";
  categoryId?: string;
  projectId?: string;
  templateId?: string;
  sourceTaskId?: string; // for carry-forward copies
  carriedFromDate?: string;
  dueTime?: string; // HH:mm local time
  target?: {
    value: number;
    unit: string;
    progress: number;
  };
  subtasks?: Array<{
    id: string;
    title: string;
    isCompleted: boolean;
  }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
  cancelledAt?: Timestamp;
  origin: "manual" | "template" | "carry-forward";
  idempotencyKey?: string;
}
```
For tasks with many subtasks or substantial history, use subcollections rather than allowing the parent document to grow indefinitely.

### `users/{uid}/projects/{projectId}`
```ts
{
  name: string;
  description?: string;
  categoryId?: string;
  status: "active" | "paused" | "completed" | "archived";
  sortOrder: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `users/{uid}/carryForwardDecisions/{date}`
```ts
{
  destinationDate: string; // YYYY-MM-DD
  sourceDate: string; // usually previous local date
  decision: "accepted" | "declined";
  selectedSourceTaskIds: string[];
  createdAt: Timestamp;
}
```
Use a stable document ID for the destination date so the user cannot accidentally record multiple decisions for the same date. If the user needs to change a decision, define an explicit edit/reopen action and deduplicate copied tasks.

### `users/{uid}/reminderSettings/main`
```ts
{
  enabled: boolean;
  destinationEmail: string;
  emailVerified: boolean;
  timeZone: string;
  intervalMinutes?: number;
  scheduledTimes?: string[]; // HH:mm local times
  quietHours?: {
    enabled: boolean;
    start: string; // HH:mm
    end: string;   // HH:mm
  };
  dailySummaryEnabled: boolean;
  dailySummaryTime?: string; // HH:mm
  maxEmailsPerDay: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `users/{uid}/reminderEvents/{eventId}`
```ts
{
  idempotencyKey: string;
  scheduledForLocalDate: string;
  scheduledSlot: string;
  status: "pending" | "sent" | "failed" | "skipped";
  reason?: string;
  providerMessageId?: string;
  attemptCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  sentAt?: Timestamp;
  lastErrorCode?: string;
}
```

### `users/{uid}/generationRuns/{date}`
```ts
{
  date: string;
  status: "complete" | "partial" | "failed";
  templatesChecked: number;
  instancesCreated: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```
This record is a useful guard and diagnostic aid, but each task still needs a deterministic identity or transaction-level duplicate guard.

## 3. Deterministic IDs and idempotency
- Template instance key should be derived from `templateId + localDate`; use a stable document ID or a dedicated deterministic key.
- Carry-forward copy key should be derived from `sourceTaskId + destinationDate`; this prevents duplicate copies from repeated submissions.
- Reminder event key should include `uid + localDate + scheduledSlot + reminderType`.
- Never rely only on the UI disabling a button to prevent duplicates.
- Use a transaction or create-if-absent pattern on the server.

## 4. Report calculation
For a selected date range:
- `completedCount = count(status == completed)`
- `todoCount = count(status == todo)`
- `cancelledCount = count(status == cancelled)`
- `eligibleCount = completedCount + todoCount`
- `completionRate = eligibleCount > 0 ? completedCount / eligibleCount * 100 : null`
- Cancelled tasks are excluded from the denominator.
- A zero denominator is “No tasks scheduled,” not 0%.
- A carried-forward task is counted against its destination date as a new instance; source date remains unchanged.

## 5. Firestore indexes
Create composite indexes only as required by actual queries, likely combinations of:
- `date + status`
- `date + categoryId`
- `date + projectId`
- `templateId + date`
- `status + date`
Document the indexes in `firestore.indexes.json` and commit that file.

## 6. Migration and deletion
- Include a documented strategy for adding optional fields safely.
- Category deletion must reassign or uncategorize associated tasks.
- Account deletion must remove user-owned records and related scheduled/queued events; implement as a trusted backend process with confirmation.
- Data export should export only the authenticated user’s data.
