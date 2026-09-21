# 12 - Integration tests with Firebase emulator

Type: task
Status: open
Blocked by: 06

## Question

Unit tests cover `config`, `presence`, and `sessionService` in isolation; there are no end-to-end tests against a real (emulated) Firebase.

**Decision**: wire vitest into the Firebase emulator — connect the SDK to Firestore/Auth/RTDB emulators (`FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`, `FIREBASE_DATABASE_EMULATOR_HOST`; demo project), run via `firebase emulators:exec "npm run test"`, using the research ticket's wiring recipe. Scenarios:
- **Full lifecycle**: host creates → participant submits → second participant submits → vote (write-once enforced per round) → host picks winner → answering → mark answered → next round → end.
- **Moderation**: host deletes a question; participant stream sees it removed.
- **Realtime**: a second "client" subscribing to the questions subcollection sees a new question appear without its own write.
Test scripts get a `test:integration` entry; unit tests stay emulator-free.