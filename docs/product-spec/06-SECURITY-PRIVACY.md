# 06 — Security and Privacy Requirements

## 1. Authentication and authorization
- Use Firebase Authentication.
- All app data is private and user-scoped.
- Every Firestore read/write must be restricted to the authenticated owner (`request.auth.uid == uid`).
- Do not trust `uid` values supplied by the client for privileged server operations.
- Server handlers must verify Firebase ID tokens and derive UID from the verified token.
- Do not allow unauthenticated users to read task data, reminder settings, or reports.

## 2. Firestore Rules
- Start with deny-by-default rules.
- Scope data under `/users/{uid}/...`.
- Allow access only when authenticated UID equals the path UID.
- Validate allowed fields and types where practical.
- Prevent clients from changing server-owned fields such as delivery outcomes, provider message IDs, generation-run status, and privileged audit data.
- Do not rely on hiding UI elements for security.
- Test rules using Firebase Emulator Suite or an equivalent rules test harness.
- Never use permissive production rules such as `allow read, write: if true`.

## 3. Secrets
- `RESEND_API_KEY`, Firebase Admin credentials, and any privileged server secrets must be server-side only.
- Use deployment secret storage or environment configuration.
- Commit `.env.example` with placeholders; never commit `.env.local` or real credentials.
- Avoid logging tokens, API keys, full reminder email bodies, or private task details.

## 4. Email safeguards
- Send only to the authenticated user’s configured address.
- Verify the destination address before enabling recurring emails.
- Rate-limit test-email actions.
- Enforce daily send caps and a minimum interval.
- Honour disabled reminders and quiet hours.
- Keep an idempotency record for each scheduled send.
- Handle provider failures truthfully and safely.
- Never expose provider response data that includes secrets.

## 5. Data integrity
- Validate all input on the server.
- Enforce ownership before reading or modifying task IDs.
- Prevent duplicate daily task generation, carry-forward copies, and reminder sends.
- Use transactions/batches where multiple writes form one logical operation.
- Keep previous dates unchanged during carry-forward.
- Do not let clients write privileged job status fields.

## 6. Privacy and user controls
- Provide sign-out.
- Provide clear reminder opt-in/opt-out.
- Plan data export and account/data deletion.
- Explain that task information is stored in the configured Firebase project.
- Avoid collecting information not required for the product.
- Analytics should be based on the user’s own records; no third-party tracking is required for MVP.

## 7. Threat and abuse cases to test
- User A attempts to read User B’s task by guessing an ID.
- Unauthenticated request attempts to call a privileged endpoint.
- User manipulates `uid`, `completedAt`, `sentAt`, or provider fields.
- A scheduled function retries after a partial failure.
- A test-email endpoint is spammed.
- A malicious/invalid time zone or huge interval is submitted.
- User sends malformed task IDs, excessively long text, or invalid dates.
- Category deletion tries to remove associated history without confirmation.
