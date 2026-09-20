# 14 - Admin dashboard for hosts

Type: task
Status: resolved
Blocked by:

## Question

Hosts want past-session analytics. **Decision**: a dashboard scoped to the **current device's anonymous identity** (decided) — no new auth. Query `sessions` where `hostUid == my anonymous uid`, listed newest-first with per-session stats (submitted, answered, unanswered, phase, round, `createdAt`) and a link to open that session's summary/export (ticket 09). Reached from the host control area. UI must state the caveat plainly: "Sessions you hosted *from this browser*" — clearing browser data loses the list, and other devices never see it. No private question text on the dashboard — totals and phases only (anonymity invariant).

## Answer

Shipped `HostDashboardView` (`dashboard` view, reached via a "Past sessions" button in the host control sidebar), scoped to `uid` with no new auth:
- **Service** (`sessionService.ts`): `listHostSessions` (`where hostUid ==`, newest-first client-side sort so no composite index is needed), `countSessionQuestions` (two `getCountFromServer` aggregations — totals only, no question text transferred), `listHostSessionSummaries` (session + submitted/answered/unanswered), `listFirestoreQuestions` (one-time newest-first read for the summary). All return empty/zero when Firebase is unconfigured.
- **List**: code, phase, round, created date, submitted/answered/follow-up counts — totals and phases only, question text never fetched for the list. Caveat rendered plainly: "Sessions you hosted *from this browser*. Clearing browser data loses this list — sessions hosted on other devices never appear here."
- **Summary**: per-row "Summary" opens a read-only panel (stats + ticket-09 CSV download / copy follow-up list, reusing the pure builders); live session state untouched. Back to list and back to live session included.
- **Demo/offline**: explanatory empty state ("turn off demo mode…"), no crash; loading/error/retry states covered.
- **Shared `src/lib/timestamps.ts`**: `toDate`/`timestampMillis`/`formatTimestamp` extracted from `sessionExport` (which now reuses them) for the sort + date display.
- **Tests**: 6 lib + 8 service + 7 component tests. Full suite 75/75 pass; lint 0 errors; build succeeds. No Firestore rules change needed (reads already authed).