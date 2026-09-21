# Ask Leadership

Real-time, anonymous Q&A for internal meetings. Employees submit questions, vote on what matters, and leadership answers live.

Firebase-backed, pseudonymous participation, multi-device. React + Vite + Tailwind.

## Why anonymous?

Participants sign in with Firebase Anonymous Auth — one device = one stable pseudonymous identity, enough for the server to enforce one-vote-per-round and rate limits, anonymous enough that questions can never be linked to a real person. See `docs/adr/0001-pseudonymous-participation.md` for the trade-offs.

## Getting started

```bash
npm install

# configure Firebase (see .env.example) — or run in demo mode below
cp .env.example .env.local   # fill in your project's values

npm run dev
```

## Demo mode

With Firebase unconfigured, or by setting `VITE_DEMO_MODE=true`, the app runs entirely from localStorage using the same state machine — useful for pitches and offline demos.

```bash
VITE_DEMO_MODE=true npm run dev
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the built app |
| `npm run lint` | Oxlint |
| `npm run test` | Vitest unit tests |
| `npm run test:watch` | Vitest watch mode |

## Tests

Unit tests run with vitest, no Firebase required:

```bash
npm run test
```

Emulator-based integration tests (Firestore + Auth) are in progress — the `test:integration` script and suite land with the feature plan tracked in `.scratch/production-hardening/`.

## Deploy

`firebase.json` wires Firestore rules + indexes, RTDB rules, and Hosting (`dist/`).

```bash
npm run build
firebase deploy
```

## How it works

- Session ID is the join code (`AL-XXX`); `?join=AL-XXX` takes a participant straight into the room.
- Questions and votes stream live from Firestore — every client sees new questions and vote counts without reloading.
- The host controls the session lifecycle: `setup → submitting → voting → answering → followup → ended`, and runs voting rounds.
- Presence (people in the room) comes from the Realtime Database via `onDisconnect` — see `src/firebase/presence.js`.

Domain vocabulary lives in `CONTEXT.md`; data models and security rules are in `ARCHITECTURE.md`.