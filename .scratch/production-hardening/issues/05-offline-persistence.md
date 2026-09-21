# 05 - Offline support for flaky connections

Type: task
Status: open
Blocked by:

## Question

"Offline support for flaky connections": questions/votes should survive a dropped connection and writes should queue, not silently vanish.

**Decision** (per research ticket facts): enable Firestore **offline persistence** (`persistentLocalCache` with `IndexedDbLocalCache`, single-tab default). Add a connectivity + pending-writes indicator: a slim banner when `Firestore.onSnapshotsInSync`/connectivity state reports offline or writes are queued (`waitForPendingWrites` best-effort), with copy like "Offline — changes will sync when you're back". Retry surfaces existing queued writes; no custom write queue. Demo mode is untouched.