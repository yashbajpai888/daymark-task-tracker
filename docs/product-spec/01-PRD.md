# 01 — Product Requirements Document (PRD)

## 1. Product overview
**Product name:** Daymark (working name; product name can be changed later)  
**Product type:** Personal productivity web application  
**Primary goal:** Help one person organize daily responsibilities, build consistent habits, manage work, and understand progress over time without repeatedly recreating routine tasks.

## 2. Problem statement
The user needs a single place to:
- See what needs to be done today.
- Check off tasks and instantly understand completed vs. remaining work.
- Maintain recurring habits without manually creating them every day.
- Organize tasks into built-in and user-created sections.
- Decide whether unfinished tasks should be brought into a new day.
- Receive gentle email reminders on a configurable schedule.
- Review reliable daily, weekly, and monthly progress reports.

## 3. Target user and access model
Initial release is private and single-user-first. Use Firebase Authentication and protect all personal data. Design the data model so multi-user support can be added later without a rewrite, but do not build public registration, teams, roles, or collaboration unless explicitly requested.

## 4. Product principles
1. Calm and uncluttered.
2. Daily execution first; analytics live in a dedicated Reports section.
3. Historical records are immutable in normal workflows.
4. Recurring templates are separate from dated task instances.
5. The user stays in control of carry-forward and reminders.
6. No fake progress, fake email sends, or misleading success states.
7. Desktop and mobile are first-class experiences.

## 5. Navigation and main sections
- **Home / Overview:** today’s summary, completion progress, a short task list, and a small habit summary.
- **Daily:** date-based task list and daily history.
- **Work:** workspaces/projects/categories and their tasks.
- **Habits:** recurring habit templates, targets, schedules, and habit history.
- **Reports:** daily, weekly, and monthly completion analytics.
- **More / Settings:** reminder preferences, appearance, account, categories/tabs, data export, and app settings.
- User-created tabs/categories should be manageable: create, rename, reorder, archive, and delete with confirmation.

## 6. Functional requirements

### FR-01 Authentication
- Allow secure sign-in using Firebase Authentication.
- Provide sign-out.
- Protect app pages and data from unauthenticated access.
- Provide useful loading, error, and empty states.
- Do not expose service-account credentials or provider secrets in the browser.

### FR-02 Dashboard
- Display current date in `Asia/Kolkata` by default.
- Show total tasks, completed tasks, remaining tasks, and completion percentage for the selected day.
- Show a concise list of today’s tasks with quick completion controls.
- Show a compact habit summary.
- Do not put every report or setting on the dashboard.
- Distinguish “no tasks” from “tasks not loaded yet.”

### FR-03 Task management
A task supports:
- Title (required)
- Optional description/notes
- Status: `todo`, `completed`, or `cancelled`
- Optional due date and time
- Priority: `low`, `medium`, `high`
- Category/tab and optional project
- Optional subtasks
- Optional source template reference
- Created and updated timestamps
- Completion timestamp when completed

Users can create, edit, complete/uncomplete, cancel, and delete tasks. Destructive actions should ask for confirmation where appropriate. Completion should be a quick, reversible action.

### FR-04 Daily task records
- A task instance belongs to a specific local date.
- Dated instances must be separate from recurring templates.
- Editing or completing a task for one day must not silently change other dates.
- Preserve daily historical reporting.
- Use stable identifiers and idempotent creation to prevent duplicates.

### FR-05 Recurring habits and templates
- Create a reusable template once; generate dated instances on applicable days.
- Support daily, selected weekdays, weekly, and one-time schedules in the initial design. Monthly recurrence can be added if implementation remains straightforward; otherwise document it as a later phase.
- Allow pause/resume, edit, archive, and delete.
- Editing a template affects future generated instances by default, not completed historical instances.
- Habits may have a simple checkbox target or a measurable target, such as water intake.
- For measurable targets, support target value and unit, progress entry, and completion when target is reached.
- A habit can have an optional start date, end date, and reminder time.
- Do not create Sunday tasks for a habit configured Monday–Saturday.

### FR-06 Custom tabs and categories
- Built-in areas: Daily, Work, Habits, Reports.
- User can add custom categories/tabs, rename, reorder, colour-tag with restrained semantic colours, archive, or delete.
- Category deletion must offer a clear choice: move existing tasks to another category or leave them uncategorized. Never silently delete associated tasks.
- Avoid allowing a user-created category to break required built-in navigation.

### FR-07 Pending-task carry-forward
- On the first app visit of a new local day, if the previous day has eligible incomplete tasks and the user has not made a carry-forward decision for that date, show a decision prompt.
- Choices: **Add selected pending tasks to today** or **Do not add**. Allow selecting individual tasks.
- A “Do not add” decision must not create copies.
- The previous date’s task records remain unchanged.
- Carried tasks are new dated instances linked to their source task, with a clear carried-forward marker.
- Prevent duplicate carry-forward of the same source task into the same destination date.
- Provide a manual “Add to today” action for older pending tasks.
- Do not carry forward cancelled tasks, tasks already completed, or recurring habits that will be generated independently today.
- Dismissing the prompt should not be interpreted as Yes or No. The decision can remain pending and be shown again later that day, but do not show it on every route navigation.
- Provide a setting for the user to review carry-forward behaviour in a future iteration; initial release should use the explicit prompt.

### FR-08 Email reminders
- User can enable/disable reminders globally.
- User can configure the destination email address, time zone, reminder interval or specific clock times, quiet hours, and daily summary preference.
- Support gentle reminder templates: “You still have a few tasks left for today” and an end-of-day summary.
- Reminder emails must summarize actual incomplete tasks for the selected date.
- Do not send reminders when disabled, during quiet hours, after the day’s tasks are all complete (unless a separately enabled summary is due), or to an unverified/invalid destination.
- Provide a “Send test email” control with a clear result.
- Store email delivery outcomes and idempotency keys to prevent duplicate sends.
- Never claim an email was sent until the backend/provider confirms success.
- Interval reminders should have a reasonable minimum interval and daily cap to prevent accidental email spam.
- Initial suggested defaults: reminders disabled until configured; one daily summary at 9:00 PM local time; optional interval reminders disabled by default. The user can change these.

### FR-09 Reports and analytics
- Daily report: total eligible tasks, completed, incomplete, cancelled, completion rate.
- Weekly and monthly trends.
- Category-wise completion and habit consistency.
- Pie/donut chart for completed vs remaining tasks, plus a trend chart for completion over time.
- Use actual stored records; never hardcode numbers.
- Define whether cancelled tasks are excluded from completion-rate denominator; recommended: exclude cancelled tasks.
- Empty days should be displayed as “No tasks scheduled,” not as 0% productivity.
- Reports must use the user’s local day boundaries and `Asia/Kolkata` by default.
- Historical data should not change when tasks are carried forward to another date.
- Explain that completion rate measures recorded tasks, not personal worth or productivity quality.

### FR-10 Calendar and date navigation
- Select a date and inspect its task list and progress.
- Move to previous/next day.
- Highlight dates with tasks or meaningful activity without overloading the calendar.
- Date selection must use local-time semantics consistently.

### FR-11 Settings
- Appearance: Graphite & Mint dark theme as default. A light theme is optional later, not required for MVP.
- Time zone setting, default `Asia/Kolkata`.
- Email reminder preferences.
- Manage categories/tabs.
- Data export and account deletion should be planned and documented; implement export if feasible in MVP.
- Confirm destructive changes.

### FR-12 Responsive design
- Desktop: sidebar + primary content + optional secondary panel.
- Mobile: compact header and bottom navigation (Home, Daily, Work, Habits, More).
- Reports and settings accessible from More or dedicated navigation where space allows.
- Avoid horizontal scrolling at common phone widths.
- Touch targets should be comfortably tappable; target around 44px.
- No desktop table squeezed into mobile: adapt to stacked rows/cards.

## 7. Non-functional requirements
- Strong TypeScript typing and reusable components.
- Accessible contrast, keyboard navigation, focus indicators, and semantic labels.
- Useful loading, error, empty, and success states.
- Avoid unnecessary client-side listeners and repeated database reads.
- Firestore queries should be indexed as needed and avoid unbounded collection reads.
- Use server-side scheduled jobs for time-dependent email delivery.
- Error handling must be user-friendly and log useful technical details without secrets.
- Keep code readable and maintainable.

## 8. MVP scope
**Must ship:** authentication, dashboard, dated tasks, custom categories, recurring daily/weekday habits, carry-forward prompt, email reminder settings, scheduled reminder backend, reports, mobile layout, security rules, basic tests, deployment instructions.

**Can follow after MVP:** shared/team accounts, push notifications, native app, calendar provider sync, AI task suggestions, gamification, complex recurring rules, multiple user roles, public marketing site.

## 9. Success criteria
- User can create and complete tasks on desktop and mobile.
- Daily recurring templates generate no duplicates.
- Carry-forward choices behave exactly as selected.
- Previous-day reports remain stable when tasks are carried forward.
- Scheduled email jobs respect user settings and do not duplicate sends.
- Reports match task records for tested dates.
- Firestore security rules prevent unauthorized reads/writes.
- No primary control is decorative or nonfunctional.
