# 08 - Question moderation

Type: task
Status: open
Blocked by: 06

## Question

The host can remove inappropriate questions, but today `removeQuestion` only mutates **local state** — it never deletes in Firestore, so nothing happens for anyone else.

**Decision**: host removal deletes the question document in Firestore (`deleteFirestoreQuestion` in `sessionService`; rules already allow host delete) and the live stream removes it from every client's feed. Host UI gets a confirm step (small inline confirm or dialog) before the delete. Deletion during voting keeps vote-marker docs harmless (they are per-round and orphaned safely). Product behavior: removed questions are gone for everyone and do not appear in exports. Covered by the moderation emulator test (ticket 12).