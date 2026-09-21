# Rate limiting for anonymous submissions

## Summary

- Add a 10-second client cooldown between question submissions.
- Show a live countdown and disable the submit button during the cooldown.
- Enforce the same limit server-side with a per-session `rate_limits/{uid}` marker.
- Record TTL metadata for sessions, questions, votes, and rate-limit markers.
- Add Firestore rules and service-level regression coverage for rate-limited submissions.
- Add an emulator integration test and keep emulator-only tests out of the default suite.
- Document the Firestore TTL setup and resolve issue 15.

## Verification

- `npm run lint` passes with no warnings or errors.
- `npm test` passes: 15 test files, 81 tests.
- `npm run build` passes.

The emulator integration test is available through `npm run test:integration`. It requires a compatible local JDK; the installed Firebase tooling requires Java 21 or newer.
