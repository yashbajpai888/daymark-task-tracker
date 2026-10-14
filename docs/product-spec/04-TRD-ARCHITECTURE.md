# 04 — Technical Requirements Document (TRD)

## 1. Recommended stack
- Next.js App Router
- TypeScript with strict mode
- Tailwind CSS
- Firebase Authentication
- Cloud Firestore
- Firebase Cloud Functions (server-side scheduled processing)
- Cloud Scheduler via scheduled functions as required
- Resend for email delivery
- Recharts for charts
- Lucide React for icons
- Vercel for the Next.js frontend
- Firebase project for Auth, Firestore, Functions, and scheduled jobs

Do not add Redux, Prisma, Redis, a second database, or another component library unless there is a concrete requirement and approval.

## 2. High-level architecture
- **Client:** Next.js pages/components; Firebase client SDK for authenticated, permitted reads and writes.
- **Server-side API/Functions:** privileged operations, scheduled generation, reminder dispatch, provider calls, and any action requiring Admin SDK.
- **Auth:** Firebase Authentication; verify ID tokens on trusted endpoints.
- **Database:** Firestore, scoped by user ID.
- **Email:** Resend called only from trusted server code.
- **Hosting:** Vercel for Next.js; Firebase for backend services.

## 3. Suggested application structure
```text
src/
  app/
    (auth)/
      login/
    (app)/
      home/
      daily/
      work/
      habits/
      reports/
      settings/
    api/
      tasks/
      carry-forward/
      reminders/
      export/
  components/
    layout/
    tasks/
    habits/
    reports/
    settings/
    ui/
  lib/
    firebase/
      client.ts
      admin.ts
    auth/
    dates/
    tasks/
    habits/
    reports/
    reminders/
    validation/
  types/
  hooks/
  styles/
functions/
  src/
    scheduled/
    tasks/
    reminders/
    shared/
```
This is a suggested structure, not a requirement to create empty files for every folder. Keep modules cohesive.

## 4. Server/client boundaries
- Client Firebase configuration may contain Firebase web app configuration values, which are not private secrets; enforce security through Auth and Firestore Rules.
- Admin SDK credentials, Resend API key, and privileged environment variables must never be bundled to client code.
- Use server-side functions for privileged actions and scheduled processing.
- Validate all incoming input on the server with a schema validator (e.g. Zod).
- Never trust a client-provided user ID without verifying it matches the authenticated identity.
- Use server timestamps for audit fields.

## 5. Scheduled work
- Daily generation should be idempotent. It may be triggered by a scheduled backend process and/or an authenticated first-visit server action that checks for missing instances.
- Scheduled reminders must run server-side even when the browser is closed.
- Use deterministic IDs or transaction-based guards for generated tasks and reminder events.
- Scheduled functions may run more than once or retry; design every handler for duplicate invocation.
- Keep schedule cadence and query scope documented. Avoid scanning every task for every user.

## 6. API/action design
Use authenticated server actions or route handlers for privileged operations. Exact implementation can vary but must preserve these semantics:
- `POST /api/tasks`: create a dated task after validation.
- `PATCH /api/tasks/:id`: update allowed fields for a task owned by the user.
- `DELETE /api/tasks/:id`: delete/archive with confirmation semantics.
- `POST /api/carry-forward`: validate selected source tasks and destination date, then create idempotent copies and record decision.
- `POST /api/reminders/test`: send a test email to the authenticated user’s configured destination after validation/rate limiting.
- `POST /api/export`: export the authenticated user’s data.
Do not implement every endpoint if server actions are the chosen architecture; document equivalent operations.

## 7. Validation and data consistency
- Validate task title length and required fields.
- Validate schedule rules, time zone IDs, interval minimums, and quiet-hour ranges.
- Use Firestore transactions/batches for logically related changes.
- Keep task instances and templates separate.
- Store date keys as local `YYYY-MM-DD` plus time zone ID.
- Use stable document IDs for idempotency where feasible.
- Never calculate reports from UI-only state.
- Ensure all writes validate ownership and permitted fields.

## 8. Performance
- Query tasks by user ID and date range; add composite indexes where Firestore requires them.
- Paginate long history and audit/event lists.
- Avoid fetching all historical tasks to calculate one day’s progress.
- Use listeners only where live updates materially improve the UX; unsubscribe on unmount.
- Avoid repeated reads from nested components.
- Keep chart data aggregation bounded by the selected date range.

## 9. Observability
- Log scheduled job start/end, counts, failures, and provider response identifiers where safe.
- Do not log task descriptions or secrets unnecessarily.
- Add a basic admin/operator diagnostic strategy for failed jobs (logs and delivery records); do not expose administrative controls in the user UI.
- Display understandable error states in the app.

## 10. Environment configuration
Document required environment variables in `.env.example`, with placeholders only. Likely values include:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- Server-side Firebase Admin credentials/config using the chosen secure deployment method
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `APP_BASE_URL`
Do not commit actual secrets. Follow the deployment platform’s recommended secret management for Admin credentials.

## 11. Deployment notes
- Vercel deploys the Next.js app.
- Firebase deploys Firestore rules/indexes and Cloud Functions.
- Enable billing and configure required Google Cloud APIs for scheduled functions if required.
- Configure Resend sender/domain and verify email delivery.
- Configure authorized Firebase Auth domains for local and production URLs.
- Test a scheduled function manually in a safe environment before production.
- Include exact setup and deployment commands in the project README once implementation choices are confirmed.
