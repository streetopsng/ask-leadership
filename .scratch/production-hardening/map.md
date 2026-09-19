# Production Hardening

Label: wayfinder:map

## Destination

Production-ready Ask Leadership: infrastructure hardening (error boundaries, auth/sync loading states, TTL session cleanup, offline support), the live product loop (real-time question feed with Firestore as source of truth, host answering, question moderation, session summary + follow-up export), code quality (dead code removed, README rewritten, emulator integration tests), plus the three niceties (session templates, admin dashboard, rate limiting). Verified end-to-end against the Firebase emulator.

## Notes

- **Domain**: Ask Leadership — real-time anonymous Q&A for internal meetings. See `CONTEXT.md`, `ARCHITECTURE.md`, `docs/agents/domain.md`.
- **Skills per session**: "grilling" and "domain-modeling" when a decision is fuzzy; "tdd" when writing features; "code-review" before pushing.
- **Build is carried into the map**: this effort is build-forward. Resolving a ticket executes the feature it specifies; the ticket's Answer records what was shipped. Not decision-only.
- **Hard constraint**: pseudonymity (ADR `0001`). No change may link questions/votes to a real person. Question submitters keep `participantUid`; candidates never see real identities (host sidebar, admin dashboard, exports).
- **Demo mode**: `VITE_DEMO_MODE=true` disables Firebase entirely (localStorage state machine). It must keep working after every change.
- **Testing**: write a test before building (AGENTS.md). Integration tests run against the Firebase emulator; do not hit production.
- Workflow: new branch per feature; commit only when asked; review before push.

## Decisions so far

- [01 - Research: Firebase ops facts](issues/01-research-firebase-ops.md): TTL is `gcloud firestore fields ttls update <field> --collection-group=<cg> --enable-ttl` (no `ttls` command), ~24h deletion lag, no subcollection cascade (need per-collection policies), emulator does NOT simulate TTL. Offline: `initializeFirestore(app, { localCache: persistentLocalCache(...) })`, multi-tab opt-in, persistence off by default, per-UID cache. Emulator: web SDK ignores env vars — call `connectFirestoreEmulator`/`connectAuthEmulator`/`connectDatabaseEmulator` explicitly, use `--project demo-ask-leadership` and `firebase emulators:exec --only firestore,auth "npm test"`.
- [10 - Remove dead code](issues/10-remove-dead-code.md): deleted `App.css`, `new.html`, and the `SCATTER_WORDS` export. Lint 0 errors.
- [11 - Rewrite README](issues/11-readme-rewrite.md): rewritten for the real product (setup, demo mode, scripts, tests, deploy). References `npm run test:integration` that lands with ticket 12.
- [06 - Real-time question feed](issues/06-realtime-question-feed.md): Firestore is the source of truth — live subscriptions to the session doc, questions subcollection, and my vote marker; `mine`/`justVotedId` derived not stored. Shipped `beginHostSetup` (fixes pre-existing `HostSetupView` null-session crash) and `mode` persistence through config.

## Not yet specified

- **Dashboard content**: which per-session stats and how the per-device identity caveat is surfaced — rounds when the admin dashboard ticket is reached.
- **Moderation UX**: confirm dialog shape and whether removal is undoable — inside the moderation ticket, revisit at the frontier.
- **Rate-limit window**: concrete submission/creation thresholds — inside the rate-limiting ticket.

## Out of scope

- **Cross-device host accounts** (Google Auth) — needs durable host identity; supersedes the pseudonymous browser-scoped model.
- **Literal "email to participants"** — impossible under anonymity; replaced by host-distributed follow-up list (decided).
- **Scheduled Cloud Function cleanup** — Firestore TTL policy replaces it (decided).
- **Custom offline write queue** — Firestore offline persistence covers it (decided).
- **Non-browser clients** — web app only.