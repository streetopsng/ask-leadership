# 03 - Loading states while auth/sync initializes

Type: task
Status: open
Blocked by:

## Question

On mount the app renders `landing` immediately, but signing in anonymously and (for a join link) fetching the session are async. Users can click around before state is ready, or see the wrong view flash.

**Decision**: gate the app behind init state. `SessionContext` exposes `authStatus` (`idle | signingIn | signedIn | error`) and `syncStatus` (`idle | syncing | synced | error`). A `StageFrame` + `Waveform` splash renders while `signingIn`/`syncing`; splash copy distinguishes "Signing you in…" from "Joining the room…". Demo mode skips the splash entirely (no auth). View switches only fire once auth resolves.