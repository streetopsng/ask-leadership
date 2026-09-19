# 15 - Rate limiting beyond security rules

Type: task
Status: open
Blocked by: 06

## Question

Spam protection for anonymous submissions. **Decision**: dual layer (decided):
- **Client**: minimum 10s between question submissions per session (`SessionContext` guard + inline countdown/disable on the submit button).
- **Server-rule**: a `rate_limits/{uid}` marker doc per session holding `lastSubmissionAt`; Firestore rules **deny** a question create when `request.time - lastSubmissionAt` is under the window (rules can compare timestamps against `request.resource` — validate exact rule syntax). Prevented writes surface as a clear "please slow down" toast, not a crash. Marker docs get TTL cleanup like everything else (ticket 04). Covered by an emulator assertion in ticket 12's suite.