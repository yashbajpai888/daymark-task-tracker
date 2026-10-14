# 02 — User Flows and Business Logic

## 1. First-time setup
1. User opens the app.
2. If signed out, show sign-in.
3. After authentication, check profile/settings initialization.
4. Ask for or confirm time zone (default `Asia/Kolkata`) and reminder preferences.
5. Show a small setup flow to create initial habits, with optional suggested examples: Gym, Running, Water Intake, Reading. Suggestions must be optional, editable, and never inserted without consent.
6. Land on Home.

## 2. Daily app entry
1. Determine the current local date using the user’s saved IANA time zone.
2. Run/check idempotent daily-generation process for that date.
3. Generate eligible habit/task instances from active templates if they do not already exist.
4. Check whether a carry-forward decision is needed for eligible tasks from the prior date.
5. If needed, show the carry-forward prompt once for the current date until decided.
6. Load today’s tasks and calculate counts from the actual records.

## 3. Carry-forward prompt
- Title: “A few tasks are still unfinished”
- Show source date and selected task names.
- Let user select individual tasks; default may preselect eligible incomplete tasks, but the user must be able to deselect.
- Actions:
  - “Add selected to today”
  - “Start fresh”
  - Close/dismiss without decision
- On Add: create new dated instances for selected source tasks; store `sourceTaskId`, `carriedFromDate`, `date`, and idempotency key. Do not mutate the source task.
- On Start fresh: record a `declined` decision for the destination date; create no task copies.
- On dismiss: record no final decision; avoid reopening on every navigation. Re-prompt on a later app entry that day or provide a persistent reminder banner.
- If there are no eligible tasks, do not show the prompt.
- If there is already a decision for the date, do not show the prompt again.

## 4. Recurring template lifecycle
1. User creates a template with title, category, schedule, optional target, and active state.
2. Backend or an idempotent server-side generation service checks templates for a local date.
3. For each eligible template/date, create one instance only.
4. Instance stores `templateId` and `scheduledDate`.
5. If template changes, future instances use the new template configuration. Historical instances remain unchanged.
6. If template is paused or archived, no new instances are generated.
7. Re-enabling a template should not retroactively generate every missed instance without explicit user intent.

## 5. Task lifecycle
`todo -> completed` and `completed -> todo` are allowed.
`todo -> cancelled` is allowed.
Cancelled tasks are excluded from completion denominator.
Deleting is a separate action and should require confirmation if the task has history.
Completed tasks should preserve `completedAt`; when unchecked, clear it or record an audit event if audit history is implemented.
Task edits affect only the selected dated instance unless the user explicitly chooses to edit the source template.

## 6. Reminder processing
1. Scheduled backend job runs at its configured cadence.
2. Query users whose reminder settings allow a check at the current time.
3. Resolve each user’s local time and quiet hours.
4. Determine due reminder slot(s) using the user’s configured schedule.
5. Load only relevant dated tasks.
6. If reminders are enabled and there are incomplete tasks, create a unique reminder event using a deterministic idempotency key.
7. Send through Resend from trusted server code.
8. Record success/failure, provider message ID where available, timestamps, and retry status.
9. Retry transient failures safely without sending duplicate emails.
10. Enforce maximum sends per day and minimum interval.

## 7. Reports
- Query task instances by date range and category.
- Exclude cancelled tasks from completion denominator.
- Completion rate = completed / (completed + todo) * 100.
- If denominator is zero, show “No tasks scheduled.”
- Habit consistency should be calculated only across dates on which the habit was scheduled, not every calendar day.
- Do not count carried-forward task as completed on the source date unless it was actually completed on that source date.

## 8. Time and date rules
- Store server timestamps in UTC.
- Store each task’s local date as `YYYY-MM-DD` and its relevant time zone ID.
- Use IANA time zone IDs, not a fixed `+05:30` offset in application logic.
- Day boundaries are local midnight-to-midnight in the saved time zone.
- Do not derive local dates by slicing an arbitrary UTC timestamp.
- Date changes near midnight must be tested.

## 9. Error and edge states
- Offline or Firestore error: show retry and preserve unsaved input where possible.
- Email failure: show failure status; do not show “sent.”
- Missing time zone: use configured default and let user change it.
- Duplicate scheduled invocation: no duplicate instances or emails.
- Task deleted while carry-forward dialog is open: revalidate before creating copies.
- User signs in on a new device: preferences and records should load from Firestore.
