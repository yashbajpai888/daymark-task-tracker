# 07 — Test Plan and Acceptance Criteria

## 1. Authentication
- Signed-out user cannot access private app pages or data.
- Valid sign-in loads the correct user’s preferences and tasks.
- Sign-out returns user to the sign-in screen.
- Invalid/expired sessions are handled gracefully.

## 2. Task CRUD
- User can create, edit, complete, uncomplete, cancel, and delete tasks.
- Required title validation works.
- Completion state persists after refresh and sign-in on another device.
- Editing one dated instance does not mutate other dated instances.
- Cancelled tasks are excluded from completion-rate denominator.
- Failed saves show an error and do not show false success.

## 3. Daily generation
- A daily template creates one task instance for an eligible date.
- Re-running generation does not create duplicates.
- A selected-weekday template only creates instances on configured weekdays.
- Paused/archived templates do not generate new tasks.
- Template edits do not rewrite completed historical instances.
- Missing/failed generation is recoverable without duplicate records.

## 4. Carry-forward
- Prompt appears only when eligible pending tasks exist and no decision exists for the destination date.
- User can select some, all, or none of the eligible tasks.
- Accepting creates new instances only for selected tasks.
- Declining creates no copies.
- Dismissing does not silently accept or decline.
- Repeated submit or retry does not duplicate copies.
- Previous-day tasks and reports remain unchanged.
- Completed, cancelled, and independently regenerated recurring tasks are not carried forward.
- Manual carry-forward works for older eligible tasks.

## 5. Reminders and email
- Disabled reminders send nothing.
- Quiet hours are respected.
- Interval and fixed-time schedules behave according to saved settings.
- No reminder is sent after all eligible tasks are completed, except an enabled summary.
- Test email reports provider success/failure accurately.
- Duplicate scheduled invocation does not send duplicate email.
- Transient failure retry does not duplicate a previously successful send.
- Daily cap and minimum interval are enforced.
- Email uses the correct local date and relevant tasks.

## 6. Reports
- Counts match task records for test dates.
- Completion rate matches `completed / (completed + todo)`.
- Cancelled tasks are excluded.
- Empty date displays “No tasks scheduled.”
- Week/month boundaries use the user’s time zone.
- Carried-forward tasks count on the destination date only.
- Habit consistency denominator includes only scheduled days.

## 7. Categories and projects
- User can create, rename, reorder, archive, and delete custom categories.
- Deleting a category requires reassignment or uncategorization choice.
- Built-in navigation remains functional.
- Project filters show the correct tasks.

## 8. Responsive UI and accessibility
- No horizontal overflow at 320px, 375px, 390px, 768px, 1024px, and desktop widths.
- Mobile bottom navigation does not cover content.
- Dialogs and forms work with keyboard.
- Visible focus states exist.
- Status is not communicated by colour alone.
- Loading, empty, success, and error states are implemented.
- Reduced-motion preference is respected.

## 9. Security
- Firestore rules block cross-user access.
- Client cannot write privileged email/job fields.
- Server endpoints verify authentication and ownership.
- Secrets are not present in client bundles or Git.
- Rules and backend tests run in CI or documented local commands.

## 10. Release acceptance gate
Do not call the product complete until:
- All must-have flows above pass.
- `npm run lint`, type checks, and production build pass.
- Firestore rules/indexes are included.
- Scheduled functions are deployed and tested in a safe environment.
- Email provider/domain is configured and a real test email is verified.
- `.env.example` and setup instructions are complete.
- No visible primary control is a dead button.
- The developer provides a concise verification report and known limitations.
