# feat: Real-time Firebase integration with pseudonymous auth

## Summary

Transforms Ask Leadership from a single-device demo into a real-time, multi-device Firebase-backed application. Two browsers can now share a session, vote on questions, and see live updates.

---

## Motivation

The original app looked complete but was a facade — two browsers never shared a session. Questions, votes, and presence were all client-side localStorage. This PR makes the app actually work.

---

## Changes

### Identity & Auth
- Firebase Anonymous Auth for pseudonymous participation
- Stable UID per session — anonymous enough for safety, stable enough for enforcement
- Hardcoded credentials removed; requires `.env.local`

### Data Model (Firestore)
| Before | After |
|--------|-------|
| Single doc with `questions: []` array | Subcollection `sessions/{id}/questions/{qid}` |
| `updateDoc({ questions: wholeArray })` | `FieldValue.increment` per question |
| No vote enforcement | `sessions/{id}/votes/{round}_{uid}` write-once marker |

### Session & Routing
- Session ID = join code (`AL-XXX`), 1:1 mapping
- `?join=AL-XXX` → `getDoc` by code → subscribe → real-time
- Host identified by `hostUid` at creation
- Only `hostUid` may advance phases

### Presence (RTDB)
- `onDisconnect` presence: writes on connect, auto-deletes on disconnect
- Host reads live participant count via `subscribeToPresence`

### Security Rules
**Firestore** (`firestore.rules`):
- `sessions/{id}`: create if authenticated; update phase/hostUid only by hostUid
- `questions/{id}`: create with matching participantUid; update/delete only by hostUid
- `votes/{round}_{uid}`: create self-only; no updates, no deletes

**RTDB** (`database.rules.json`):
- `presence/{sessionId}/{uid}`: write only if `auth.uid === $uid`

### Demo Mode
- `VITE_DEMO_MODE=true` disables all Firebase writes
- Runs entirely from localStorage — useful for pitches

### Testing
- 15 tests across 3 files (vitest)
- Config: `isFirebaseConfigured`, `signInAnonymouslyToFirebase`
- SessionService: create, get, submit, vote, markAnswered, updatePhase
- Presence: goOnline, goOffline

---

## Files

| File | Change |
|------|--------|
| `src/firebase/config.js` | Strip hardcoded creds, add auth, gate init |
| `src/firebase/sessionService.js` | Rewrite for subcollections, atomic writes |
| `src/firebase/presence.js` | New: RTDB presence with onDisconnect |
| `src/context/SessionContext.jsx` | Rewrite for Firestore source of truth |
| `src/components/views/LandingView.jsx` | Use joinSession for preview flow |
| `src/components/views/HostSetupView.jsx` | Use createSession |
| `src/components/common/RoleSwitcher.jsx` | Demo-mode-only gate |
| `firestore.rules` | Production security rules |
| `database.rules.json` | RTDB security rules |
| `firebase.json` | Deployment config |
| `firestore.indexes.json` | Empty indexes (ready for future) |
| `.env.example` | Add VITE_DEMO_MODE |
| `vite.config.js` | Add vitest config |
| `package.json` | Add test scripts + vitest |

---

## How to test

1. Copy `.env.example` → `.env.local`, fill in Firebase credentials
2. `npm run dev`
3. Open two tabs — host in one, join with code in the other
4. Verify real-time sync
5. Or set `VITE_DEMO_MODE=true` for offline demo

---

## Known remaining items

- Vote marker check is non-transactional (race condition possible)
- `confirmEnterRoom` / `startVoting` don't persist phase to Firestore
- Toast setTimeout has no unmount cleanup
- SessionContext still a monolith (30+ exports)
