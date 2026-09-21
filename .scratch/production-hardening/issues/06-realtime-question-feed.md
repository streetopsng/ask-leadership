# 06 - Real-time question feed (Firestore as source of truth)

Type: task
Status: resolved

## Answer

Rebuilt the sync layer so Firestore is the source of truth. Summary of what shipped:

**Service (`src/firebase/sessionService.js`)**
- `subscribeToFirestoreQuestions(sessionId, cb, err)` — live `onSnapshot` on the questions subcollection, newest-first.
- `subscribeToMyVote(sessionId, round, uid, cb, err)` — streams my `round_uid` marker (or null) so each client knows *whether it voted* and *for what*.
- `deleteFirestoreQuestion(sessionId, questionId)` — host delete, keeps `removeQuestion` correct under the realtime model (confirm-UX polish stays in ticket 08).
- Inlined the pointless dynamic import in `resetQuestionVotes` (previously confused Vite bundling). No behavior change.

**Model (`src/context/sessionModel.js`)** — pure helpers, unit-tested:
- `normalizeQuestion`, `withMine` (derives `mine = participantUid === myUid`; demo questions keep explicit `mine`), `applyQuestionSnapshot` (server is canonical — moderated/deleted questions disappear, optimistic items get confirmed by id).

**Context (`src/context/SessionContext.jsx`)**
- `questions` extracted from the session doc into its own state; the session subscription only merges the doc.
- Three live subscriptions gated on Firebase mode: session doc, questions feed, my vote marker (resubscribes when the round changes).
- Derived `mine`/`justVotedId`/`votedThisRound`; optimistic vote bump removed in Firebase mode (server stream drives counts).
- Demo and Firebase modes branch explicitly; demo mode unchanged apart from the new shared state shape.
- New `beginHostSetup` action: creates a draft session so `HostSetupView` renders without crashing (pre-existing crash repro'd in browser: view was reachable with `session === null`, `config.participants` blew up). `switchRole('host')` with no session now routes through it. Also fixed `mode` (Virtual/Physical) being lost on `createSession` — it now persists in `config` and syncs.

**Views** — `RoomView` and `HostControlView` read `questions` from context instead of `session.questions`.

**Docs** — `ARCHITECTURE.md` gained a "Realtime Sync" section; the "to be rewritten" comment on sessionService is gone.

**Verification** — 23 unit tests pass (5 new for `sessionModel`, 4 new for the service), 0 lint errors (5 pre-existing warnings remain, scheduled for tickets 02/03), production build passes. Browser smoke-tested the whole demo loop with zero console errors: setup → host control → open submissions → employee welcome → avatar select → room → submit → question appears top of feed → host pool shows 5/5. Cross-client realtime assertions are covered by the emulator tests (ticket 12), which this ticket unblocks.

**Post-ship code review (Standards + Spec axes):** implemented the id-confirmed merge `applyQuestionSnapshot` actually promised (optimistic items carry `pending: true` and survive merge until the server echoes them; non-pending deletions drop), extracted the duplicated null-guarded `setSession` merge into `patchSession`, collapsed `mode` to a single source of truth (`session.config.mode`; Room/HostSetup/HostReady/Invite views updated), added an `orderBy('createdAt','desc')` assertion to the service test, and pulled the premature `test:integration` reference out of the README.
Blocked by:

## Question

Today `session.questions` is a **local array** patched by the client; the Firestore subscription only watches the session doc, so nobody sees anyone else's question or vote update live. This is the keystone: every other product ticket depends on it.

**Decision**: rewrite the sync layer so Firestore is the source of truth for *everything*. Subscribe via `onSnapshot` to the session doc **plus** the `questions` and `votes` subcollections, merging remote updates into state on every client. Local-only flags stay optimistic for UX only: `mine` (matches my `participantUid`), `justVotedId`, `votedThisRound` (derived from the `votes` subcollection for me). Remove the "local array + fire-and-forget write" model and the demo-only seeding on `confirmEnterRoom` (demo mode keeps local seeding). Question identity on read is pseudonymous: clients match `participantUid == my uid` to compute `mine`, never exposing real identity. Write a test (unit for the merge logic; emulator test lives in ticket 12) before building.