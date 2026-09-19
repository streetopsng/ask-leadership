# 09 - Session summary/export + follow-up list

Type: task
Status: open
Blocked by: 06

## Question

After closing, hosts need the session's output and the unanswered questions must reach leadership. No backend.

**Decision**: host-only export from the session data (works in demo and Firebase modes):
- **CSV download** — one row per question: text, votes, answered (yes/no), round answered, avatar id, submission time.
- **Copyable follow-up list** — stat line (submitted / answered live / going to follow-up) + the unanswered questions, formatted to paste into an email to leadership.

This replaces the impossible "email to participants": the host distributes the follow-up list themselves; anonymity is preserved. Entry point on `ClosingView`.