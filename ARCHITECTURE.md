# Architecture

Real-time anonymous Q&A for internal meetings. Employees submit questions, vote on what matters, leadership answers live. Firebase-backed, pseudonymous participation, multi-device.

## Identity

Firebase Anonymous Auth. Every participant gets a stable UID per session — enough to enforce rules, anonymous enough to keep the psychological safety promise. See `docs/adr/0001-pseudonymous-participation.md` for the trade-offs.

## Data Model

### Firestore

```
sessions/{sessionId}
  ├── hostUid: string          # UID of the creator — only host may advance phases
  ├── phase: string            # setup | submitting | voting | answering | followup | ended
  ├── round: number            # current voting round, incremented by host
  ├── currentQuestionId: string|null
  ├── config: { participants, leaders, date, time, duration, meetingLink, location }
  └── createdAt, updatedAt

  sessions/{sessionId}/questions/{questionId}
    ├── text: string
    ├── participantUid: string # pseudonymous UID of the submitter
    ├── votes: number          # atomic increment, reset each Round
    ├── avatarId: string
    ├── answered: boolean
    └── createdAt

  sessions/{sessionId}/votes/{round}_{uid}
    # one document per participant per Round — server-side write-once check
```

### Realtime Database

```
presence/{sessionId}/{uid}
  # written on connect, deleted on disconnect via onDisconnect
  # host reads count for live "people in the room"
```

## Write Path

All writes to `questions/` and `votes/` use **atomic operations** (FieldValue.increment, setDoc with merge, transactions). No write replaces an entire array. This prevents the last-write-wins clobber that the original single-doc design had.

## Session Lifecycle

```
setup → submitting → voting → answering → followup → ended
        └─→ closed (intermediate: submissions closed, voting starts)
```

Host controls transitions. Participants may only submit (during `submitting`) and vote (during `voting`).

## Rounds

A **Round** is one voting cycle. During voting, participants vote on unanswered questions. The host picks the highest-voted question (winner), answers it, then starts the next Round. Votes reset each Round — no carry-over. Sessions run until the unanswered pool is empty or the host ends.

## Join & Routing

- Session ID **is** the join code (1:1, format `AL-XXX`).
- `?join=AL-XXX` → participant's browser signs in anonymously, then `getDoc` by code → subscribe → show session or "not found" error.
- Host is identified by `hostUid` written at session creation. Only `hostUid` may advance phases.
- Role comes from auth authority, not a toggle. The `RoleSwitcher` component is demo-mode-only.

## Presence

RTDB with `onDisconnect`. On connect: write `true` to `presence/{sessionId}/{uid}`. On disconnect: auto-delete. Host reads child count for live participant count. Not a Firestore concern.

## Security Rules (summary)

- `sessions/{id}`: create if `request.auth.uid != null`; write phase/hostUid only if `request.auth.uid == resource.data.hostUid`.
- `questions/{id}`: create if `request.auth.uid != null` and `participantUid == request.auth.uid`; delete only by hostUid; update only by hostUid (to mark answered).
- `votes/{round}_{uid}`: create if `request.auth.uid == split('_')[1]` (self only); no updates, no deletes.
- `presence/{sessionId}/{uid}`: write only if `auth.uid == uid` (self only); auto-delete via `onDisconnect`.

Full rules live in `firestore.rules` and `database.rules.json` (to be added).

## Demo Mode

`VITE_DEMO_MODE=true` disables all Firebase writes. The app runs entirely from localStorage using the existing state machine. Useful for pitches and offline demos. `isFirebaseConfigured()` gates the Firebase path; demo mode sets it to false.

## Deploy

- `firebase.json`: Firestore rules + indexes, RTDB rules, Hosting (serves `dist/`)
- `firebase emulators:start` for local dev
- `.env.local` (gitignored) for Firebase config; `.env.example` as template
- `firebase deploy` for production

## File Structure

```
src/
├── App.jsx                     # view switch
├── main.jsx                    # entry point
├── context/
│   └── SessionContext.jsx      # state machine (single source of truth for local state)
├── firebase/
│   ├── config.js               # Firebase init, isFirebaseConfigured()
│   └── sessionService.js       # Firestore operations (to be rewritten for subcollections)
├── components/
│   ├── views/                  # 9 views mapped to session phases
│   │   ├── LandingView.jsx
│   │   ├── HostSetupView.jsx
│   │   ├── HostReadyView.jsx
│   │   ├── HostControlView.jsx
│   │   ├── EmployeeInviteView.jsx
│   │   ├── EmployeeWelcomeView.jsx
│   │   ├── AvatarSelectView.jsx
│   │   ├── RoomView.jsx
│   │   └── ClosingView.jsx
│   └── common/                 # shared UI primitives
│       ├── AvatarBlob.jsx
│       ├── Button.jsx
│       ├── DoodleField.jsx
│       ├── Pill.jsx
│       ├── RoleSwitcher.jsx    # demo-only
│       ├── StageFrame.jsx
│       ├── ToastStack.jsx
│       └── Waveform.jsx
├── constants/
│   ├── avatars.js
│   ├── icons.jsx
│   └── seedData.js            # demo seed questions (demo mode only)
```
