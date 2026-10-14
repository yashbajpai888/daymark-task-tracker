# 08 — Implementation Plan for Antigravity

## Phase 0: Repository inspection and planning
Before modifying files:
1. Inspect existing project structure, package manager, scripts, dependencies, and current Git state.
2. Identify whether a Next.js app already exists.
3. Do not reset, delete, or rewrite existing work.
4. Compare the repository with this specification.
5. Produce a short plan with proposed file changes, dependencies, setup assumptions, and risks.
6. Ask before making destructive changes or introducing a new service/major dependency.

## Phase 1: Foundation
- Set up Next.js App Router and TypeScript strict mode if not already present.
- Configure Tailwind and Graphite & Mint tokens.
- Build app shell, responsive sidebar/mobile bottom navigation, page headers, and shared UI primitives.
- Add loading, error, and empty-state components.
- Do not seed fake production data.

## Phase 2: Firebase foundation
- Configure Firebase client SDK.
- Configure trusted server-side Firebase Admin access using secure deployment credentials.
- Implement Firebase Authentication and protected routes.
- Add initial Firestore rules and indexes.
- Add Emulator Suite instructions/tests if feasible.
- Verify unauthorized access is blocked.

## Phase 3: Tasks and categories
- Implement task model, CRUD, completion toggles, categories/tabs, priorities, dates, and optional notes.
- Implement date navigation and filters.
- Add validation and optimistic updates only where rollback is correct.
- Test refresh persistence.

## Phase 4: Recurring templates and habits
- Implement template management and schedules.
- Build idempotent daily instance generation.
- Implement checkbox habits and measurable targets.
- Test daily and selected-weekday schedules and paused templates.

## Phase 5: Carry-forward
- Implement the pending-task prompt and selected-task UI.
- Implement server-side idempotent copy creation and decision record.
- Add manual carry-forward.
- Test duplicate submissions, dismissed dialogs, and historical integrity.

## Phase 6: Reports
- Implement date-range queries and report calculations.
- Add completion donut/pie and trend charts.
- Add category/habit summaries.
- Validate charts against raw task records.
- Do not create fake metrics.

## Phase 7: Email reminders
- Implement settings UI and validation.
- Configure Resend using server-side secrets.
- Implement scheduled backend jobs, quiet hours, time zone conversion, idempotency, retry logic, daily cap, and delivery records.
- Add test-email flow with rate limiting.
- Test disabled, due, quiet-hour, completed-task, failure, and duplicate-run cases.
- Do not claim reminders work until a real provider test passes.

## Phase 8: QA, polish, and deployment
- Test desktop and mobile layouts.
- Run lint, TypeScript checks, tests, and production build.
- Review accessibility, keyboard navigation, contrast, and reduced motion.
- Deploy frontend to Vercel and backend/rules/indexes to Firebase.
- Configure Firebase authorized domains and Resend sender/domain.
- Provide environment setup and deployment instructions.
- Verify a real sign-in, task write, daily generation, carry-forward decision, report, and test email in the target environment.

## Required commands and checks
Use the scripts actually present in the repository. If missing, add suitable scripts and document them:
- lint
- typecheck
- test
- build

Do not claim a command passed unless it was actually run and its result checked.

## Required final handoff from Antigravity
At the end of each phase, report:
- Files changed
- Features implemented
- Commands/tests run and results
- Firebase/Resend/Vercel configuration still required from the user
- Known bugs, limitations, or incomplete items
- Next phase recommendation

At final handoff, include a feature acceptance checklist and distinguish verified functionality from configuration-dependent functionality.
