# 08 - Question moderation

Type: task
Status: resolved

## Answer

Host removal now deletes the question in Firestore and is guarded by an explicit confirm. Summary of what shipped:

**Context (`src/context/SessionContext.tsx`)** — `removeQuestion` was verified to already call `deleteFirestoreQuestion` (service deletes the doc; `firestore.rules` already restrict delete to the host). No context change needed; deletion streams to every client via `applyQuestionSnapshot` (server is canonical — a deleted doc leaves the feed everywhere).

**View (`src/components/views/HostControlView.tsx`)** — the remove button now shows an **inline confirm** (`Remove?` + Remove/Keep) before deleting; the first click on ✕ never deletes. `confirmingRemoveId` state tracks which question is mid-confirm. Removal is not undoable (per product decision: removed questions are gone for everyone and never appear in exports).

**Tests (`src/components/views/__tests__/HostControlModeration.test.tsx`)** — 3 view-level tests, written first (TDD), driving `HostControlView` through the `SessionProvider` with the emitted-subscription mock pattern:
- the first click on the remove button shows the inline confirm and does NOT call `deleteFirestoreQuestion`;
- choosing Keep cancels the removal (question stays in the pool, no delete);
- choosing Remove calls `deleteFirestoreQuestion('AL-TEST', q1)` and drops the question from the pool.

Delete-during-voting: vote-marker docs are per-round (`round_uid`) and orphan safely when their question is deleted — unchanged, matches the decision.

**Verification** — 40 unit tests pass (3 new), 0 lint errors (1 pre-existing warning), production build passes. Emulator moderation assertion lands with ticket 12.

Blocked by: 06

## Question

The host can remove inappropriate questions, but today `removeQuestion` only mutates **local state** — it never deletes in Firestore, so nothing happens for anyone else.

**Decision**: host removal deletes the question document in Firestore (`deleteFirestoreQuestion` in `sessionService`; rules already allow host delete) and the live stream removes it from every client's feed. Host UI gets a confirm step (small inline confirm or dialog) before the delete. Deletion during voting keeps vote-marker docs harmless (they are per-round and orphaned safely). Product behavior: removed questions are gone for everyone and do not appear in exports. Covered by the moderation emulator test (ticket 12).