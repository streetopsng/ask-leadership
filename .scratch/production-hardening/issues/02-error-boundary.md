# 02 - Error boundaries for Firebase failures

Type: task
Status: open
Blocked by:

## Question

Uncaught render/sync errors currently crash the app (errors are swallowed in `console.error` in `SessionContext`). What do users see, and how do they recover?

**Decision**: one `ErrorBoundary` wrapping the app with a friendly `StageFrame` fallback ("We hit a snag keeping the room in sync"), a **Retry** that clears error state and re-subscribes, and a safe reset-to-landing path. Render errors display the boundary; Firestore *write* failures stay non-fatal — they surface as toasts (existing `showToast`) with retry, never crash the UI. Loading/init errors show on the splash screen, not the boundary.