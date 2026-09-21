# 01 - Research: Firebase ops facts (TTL, offline persistence, emulator wiring)

Type: research
Status: resolved
Blocked by:

## Question

Three facts the effort needs, from current (2026) Firebase SDK v12 / Firestore docs:

1. **Firestore TTL policies**: exact way to declare a TTL (gcloud CLI syntax, console), special fields like `__name__` vs a timestamp field, how long after the timestamp deletion actually happens, and whether TTL cascades to subcollections (it does not — confirm what per-collection setup means for `questions` and `votes`). Does the emulator simulate TTL?
2. **Firestore web offline persistence**: current recommended API (`persistentLocalCache`, `IndexedDbLocalCache`), multi-tab default, how to detect connectivity, what queued writes expose (waitForPendingWrites?), and caveats with anonymous auth.
3. **Emulator + vitest wiring**: correct env vars (`FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`, `FIREBASE_DATABASE_EMULATOR_HOST`), connecting a web SDK app to emulators (`connectFirestoreEmulator` etc.), demo project id, and running vitest inside `firebase emulators:exec`.

## Answer

### 1. Firestore TTL policies

There is no `gcloud firestore ttls …` command. The real CLI surface is `gcloud firestore fields ttls …`:

```bash
# create/enable, one per collection group (add --expiration-offset=7d for a delay; default 0)
gcloud firestore fields ttls update ttl_field \
  --collection-group=collection_group_name --enable-ttl
# disable
gcloud firestore fields ttls update ttl_field \
  --collection-group=collection_group_name --disable-ttl
# list (optionally per collection group); add --async while enabling (takes >= 10 min)
gcloud firestore fields ttls list [--collection-group=collection_group_name]
```

Console: Databases page → **Time-to-live** (left nav) → **Create Policy** → collection group name + timestamp field name + optional expiration offset (default 0).

Key facts:
- The TTL field is a normal timestamp field you designate (JS SDK: `Timestamp`). It is **not** `__name__` and not the document ID.
- One TTL field per collection group; max 1000 field-level configurations.
- Field value must be a `Date and time` (Standard edition); Enterprise also allows an `Array` containing `Date and time` (arrays ignored by Enterprise policies created before Feb 2026). Wrong type or missing field ⇒ TTL disabled for that document; past value ⇒ immediately eligible.
- Deletion is **not** instant: "data is typically deleted within 24 hours after its expiration date"; expired docs still appear in queries/lookups until actually deleted; deletions are not in timestamp order and not transactional.
- **TTL does not cascade to subcollections.** Deleting a doc via TTL leaves `votes` under a deleted `questions` doc untouched (and orphaned subcollections are invisible to collection-group queries unless still externally addressed). `questions` and `votes` each need their own policy.

Emulator: the emulator does **not** simulate TTL deletion (`connect_firestore` "differs from production" lists no TTL behavior; no firebase-tools release note adds emulator TTL). firebase-tools #5267 (TTL, merged Dec 2022) added `ttl: true` field-override support to `firestore.indexes.json` for deploy, not runtime emulator deletion. Tests must not rely on the emulator removing expired docs.

### 2. Firestore web offline persistence

Current recommended API (v12, `firebase/firestore`):

```ts
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
```

- `localCache` must be set at `initializeFirestore`. If omitted, the default is in-memory cache — offline persistence is **disabled by default** on web.
- `persistentMultipleTabManager()` is opt-in; without it persistence is single-tab. Multi-tab requires IndexedDB and is not available with `memoryLocalCache`.
- Connectivity detection (docs pattern): listen to `window` `online`/`offline`, then call `db.enableNetwork()` / `db.disableNetwork()`. `onSnapshotsInSync(firestore, cb)` fires when all affected listeners have fired — "everything is in sync".
- Queued writes: `waitForPendingWrites(firestore)` returns a Promise resolving when all pending writes for the active user have been acknowledged by the backend — useful in tests and for sync indicators.
- Anonymous auth: the offline queue / cache is scoped to the active user's UID. Signing in a fresh anonymous user isolates pending writes and cache from a previous anonymous session, so queue handling must account for it.
- Enterprise Pipeline operations don't support offline persistence (use Core operations).
- Node/vitest caveat: the web SDK in Node has no IndexedDB, so `persistentLocalCache` isn't usable in unit tests — default to `memoryLocalCache` (default) or polyfill IndexedDB.

### 3. Emulator + vitest wiring

Env vars: `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`, `FIREBASE_DATABASE_EMULATOR_HOST`, `FIREBASE_FUNCTIONS_EMULATOR_HOST`.

- Server/Admin SDKs (firebase-admin) auto-connect when e.g. `FIRESTORE_EMULATOR_HOST` is set (value must omit a protocol).
- The **web JS SDK does not read these env vars**. You must connect explicitly before any read/write:

```ts
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
connectFirestoreEmulator(getFirestore(app), "127.0.0.1", 8080);
// similarly connectAuthEmulator(auth, "http://127.0.0.1:9099") and connectDatabaseEmulator(...)
```

- Use a demo project id: flag `--project demo-ask-leadership` on the emulator and the same `projectId` in client `initializeApp`; `demo-*` projects bypass credential/billing checks.
- Run vitest under `firebase emulators:exec --project demo-ask-leadership --only firestore,auth "npm test"` — boots emulators, runs the command, tears down (non-interactive; in-memory data per run). Clear data between tests via `DELETE http://HOST:PORT/emulator/v1/projects/<project>/databases/(default)/documents`.
- Gotchas: match the project id everywhere; call `connect*Emulator` before the first SDK operation; parallel vitest workers share one emulator server — use unique data per test or run serially.

## Sources

- https://docs.cloud.google.com/firestore/native/docs/ttl (gcloud/console steps, deletion semantics, edition rules)
- https://firebase.google.com/docs/firestore/manage-data/enable-offline (localCache, multi-tab, connectivity, persistence-default note)
- firebase-js-sdk v12 API reference: `persistentLocalCache`, `persistentMultipleTabManager`, `onSnapshotsInSync`, `waitForPendingWrites`, `connectFirestoreEmulator`
- https://firebase.google.com/docs/emulator-suite/connect_firestore (Admin auto-connect via env vars, web SDK `connectFirestoreEmulator`, "differ from production" limits)
- https://firebase.google.com/docs/emulator-suite/install_and_configure (`emulators:exec`)
- firebase-tools #5267 (closed, merged Dec 2022: CLI TTL field-override support); no emulator TTL enforcement in docs/release notes