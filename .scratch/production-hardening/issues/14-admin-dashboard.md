# 14 - Admin dashboard for hosts

Type: task
Status: open
Blocked by:

## Question

Hosts want past-session analytics. **Decision**: a dashboard scoped to the **current device's anonymous identity** (decided) — no new auth. Query `sessions` where `hostUid == my anonymous uid`, listed newest-first with per-session stats (submitted, answered, unanswered, phase, round, `createdAt`) and a link to open that session's summary/export (ticket 09). Reached from the host control area. UI must state the caveat plainly: "Sessions you hosted *from this browser*" — clearing browser data loses the list, and other devices never see it. No private question text on the dashboard — totals and phases only (anonymity invariant).