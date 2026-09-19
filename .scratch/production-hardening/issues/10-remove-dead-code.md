# 10 - Remove dead code

Type: task
Status: resolved

## Answer

- Deleted `src/App.css` (never imported — only `index.css` is loaded in `main.jsx`).
- Deleted `new.html` (abandoned prototype, self-contained).
- Removed the `SCATTER_WORDS` export from `src/constants/seedData.js` (exported, never imported anywhere; `SAMPLE_QUESTIONS` kept and still used by `SessionContext` demo seeding).
- `npm run lint` (0 errors) and `npm run build` both green. The 6 remaining lint warnings are pre-existing, all in `src/context/SessionContext.jsx`, and are expected to be cleaned up by the realtime-feed refactor (ticket 06).
Blocked by:

## Question

Verified dead code: `src/App.css` (never imported — only `index.css` is), `new.html` (abandoned prototype), and `SCATTER_WORDS` in `src/constants/seedData.js` (exported, never imported). Remove them, prune any now-unused imports, and confirm `npm run lint` + `npm run build` pass. Keep `SAMPLE_QUESTIONS`.