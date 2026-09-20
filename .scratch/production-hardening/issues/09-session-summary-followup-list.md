# 09 - Session summary/export + follow-up list

Type: task
Status: resolved
Blocked by: 06

## Question

After closing, hosts need the session's output and the unanswered questions must reach leadership. No backend.

**Decision**: host-only export from the session data (works in demo and Firebase modes):
- **CSV download** — one row per question: text, votes, answered (yes/no), round answered, avatar id, submission time.
- **Copyable follow-up list** — stat line (submitted / answered live / going to follow-up) + the unanswered questions, formatted to paste into an email to leadership.

This replaces the impossible "email to participants": the host distributes the follow-up list themselves; anonymity is preserved. Entry point on `ClosingView`.

## Answer

Shipped host-only session export on `ClosingView` (final closing step), gated by `session.hostUid === uid` so employees never see it. Works in demo and Firebase modes since it builds from local state:
- `src/lib/sessionExport.ts` — pure builders: `buildCsv` (header `text,votes,answered,round answered,avatar id,submission time`, RFC-4180 escaping, `\r\n` rows), `formatSubmissionTime` (prefers Firestore `createdAt` Timestamp, falls back to demo-mode `ts`; `YYYY-MM-DD HH:mm` local), `buildFollowUpList` (stat line `Submitted / Answered live / Going to follow-up` + unanswered questions by votes desc, ready to paste into an email), `downloadCsv` (Blob + UTF-8 BOM, `ask-leadership-<code>.csv`).
- **Round answered tracking**: the CSV's `round answered` column required recording it — `Question.answeredRound` added; `markAnswered` now writes the current session round in both demo and Firestore paths (`markFirestoreQuestionAnswered(sessionId, questionId, round)`). Host-update rules already allow this write.
- **UI**: "Download session CSV" + "Copy follow-up list" buttons (copy toasts `Follow-up list copied.` / failure toast). Entry on `ClosingView` step 1 only, so hosts always pass through it.
- **Tests**: 9 unit tests (`sessionExport.test.ts`) + 4 component tests (`ClosingViewExport.test.tsx`: host sees, non-host hides, clipboard copy + toast, CSV download filename/content). Full suite 53/53 pass; lint 0 errors; build succeeds. Demo mode untouched otherwise.