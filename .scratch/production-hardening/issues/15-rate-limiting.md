# 15 - Rate limiting beyond security rules

Type: task
Status: resolved
Blocked by: 06

## Question

Spam protection for anonymous submissions. **Decision**: dual layer (decided):
- **Client**: minimum 10s between question submissions per session (`SessionContext` guard + inline countdown/disable on the submit button).
- **Server-rule**: a `rate_limits/{uid}` marker doc per session holding `lastSubmissionAt`; Firestore rules **deny** a question create when `request.time - lastSubmissionAt` is under the window (rules can compare timestamps against `request.resource` — validate exact rule syntax). Prevented writes surface as a clear "please slow down" toast, not a crash. Marker docs get TTL cleanup like everything else (ticket 04). Covered by an emulator assertion in ticket 12's suite.

## Answer

Implemented the 10-second question submission cooldown in both the client and server write path.

- Client-side guard in `SessionContext` for a per-session cooldown, countdown text, and disabled submit button.
- Firestore service checks `rate_limits/{uid}` before creating a question and writes `lastSubmissionAt` atomically during the same transaction.
- Firestore rules reject question creates from the same participant until 10 seconds have passed.
- Added a regression in the session service tests to lock the rate-limit behavior in place.
