# 03 - Loading states while auth/sync initializes

Type: task
Status: resolved
Blocked by:

## Question

On mount the app renders `landing` immediately, but signing in anonymously and (for a join link) fetching the session are async. Users can click around before state is ready, or see the wrong view flash.

**Decision**: gate the app behind init state. `SessionContext` exposes `authStatus` (`idle | signingIn | signedIn | error`) and `syncStatus` (`idle | syncing | synced | error`). A `StageFrame` + `Waveform` splash renders while `signingIn`/`syncing`; splash copy distinguishes "Signing you in…" from "Joining the room…". Demo mode skips the splash entirely (no auth). View switches only fire once auth resolves.

## Answer

Added explicit auth and join-sync status to `SessionContext`, with separate retry paths and failure screens. The application now gates all views behind an animated `StageFrame` splash while anonymous auth or a URL-join lookup is pending. Demo mode remains immediate. Tests cover the splash copy, auth failure state, and listener recovery; the full unit suite, type check, lint, and production build pass.
