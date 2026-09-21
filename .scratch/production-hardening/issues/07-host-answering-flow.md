# 07 - Host answering flow (moveToAnswering)

Type: task
Status: resolved

## Answer

Closed the last gap in the answering loop against the real-time stream. Summary of what shipped:

**Context (`src/context/SessionContext.tsx`)**
- Extracted `beginVotingRound()` (single source of truth for "start a voting round") used by both `startVoting` and `nextQuestion`: rolls `round + 1`, clears `currentQuestionId`, sets phase `voting`, resets `votedThisRound`/`justVotedId`, and resets votes on every unanswered question (`resetQuestionVotes` in Firebase mode; a `!q.answered` local map in demo mode). Fixes the previous gap where `nextQuestion` rolled a fresh round without clearing stale vote counts — on all clients.
- Demo-mode reset now matches Firebase's reset-all-unanswered behavior exactly (the previous `nextQuestion` variant excluded `currentQuestionId` from an already-stale `session`, which diverged from both `startVoting` and Firestore).
- The rest of the loop streams through the session doc and is now test-covered: `closeVotingPickWinner` pushes `currentQuestionId` + `winner`; `moveToAnswering` streams `answering`; `markAnswered` marks the question `answered` in Firestore and streams `followup`; `nextQuestion` with no unanswered questions left ends the session for everyone. Optimistic host bumps (`patchSession`) stay and reconcile against the server echo.

**Tests (`src/context/__tests__/HostAnsweringFlow.test.tsx`)** — 3 tests, written first (TDD); harness shared via `renderAndJoin` + `makeSession`/`makeQuestion` typing from `src/types.ts`:
- picks the top-voted winner (`winner` + `currentQuestionId`, asserted against `updateFirestoreSessionPhase`), streams `answering`, then `markAnswered` marks the question and streams `followup`;
- rolls to a fresh voting round (phase `voting`, round +1, `currentQuestionId` null) and calls `resetQuestionVotes` when unanswered questions remain;
- ends the session and does NOT reset votes when no unanswered questions remain.

**Post-ship code review (Standards + Spec axes):** changed `nextQuestion` from a duplicated, drifting fork of `startVoting` to a caller of the shared `beginVotingRound`; aligned the demo-mode votes filter with Firestore's reset-all; added the `winner`/`answering`/`followup` coverage the spec called for (the earlier Answer overclaimed they were "covered by tests" when only `nextQuestion` was).

**Verification** — 37 unit tests pass (3 new), 0 lint errors (1 pre-existing warning), production build passes. Cross-client realtime assertions remain covered by the emulator suite (ticket 12).

Blocked by: 06

## Question

`moveToAnswering`/`markAnswered`/`nextQuestion` already exist and are wired in `HostControlView`, but the phase transitions must flow correctly across **all** clients once real-time sync lands.

**Decision**: close every gap against the real-time stream — the host's winner pick reaches participants (`winner` phase shows `currentQuestion`), `answering` displays the live question, `markAnswered` persists + streams to everyone (`followup`), and `nextQuestion` rolls to a fresh voting round or ends. Optimistic local phase bumps stay (snappy host UX) but must reconcile with remote truth. Covered by the lifecycle emulator test (ticket 12).