# 04 - Session expiration/cleanup (TTL)

Type: task
Status: open
Blocked by: 01

## Question

Old sessions pile up forever in Firestore. Cleanup must be automatic and low-ops.

**Decision**: native **Firestore TTL policy**, no Cloud Function. The app writes an `expireAt` timestamp on the session doc and on every question/vote doc at creation (serverTimestamp + 30 days); a TTL policy on each collection deletes expired docs. TTL does not cascade, so policies are declared per-collection (the research ticket pins the exact syntax). `endSession` writes a closer `expireAt` (+30d from end). The gcloud/console declaration lives in `ARCHITECTURE.md` plus a documented command, since `firebase.json` cannot declare TTL. Note in ARCHITECTURE that deletion can lag ~48h past `expireAt`.