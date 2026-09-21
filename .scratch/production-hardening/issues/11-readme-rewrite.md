# 11 - Rewrite README

Type: task
Status: resolved

## Answer

Rewrote `README.md` from scratch: what Ask Leadership is + why anonymous, setup steps (`.env.example` → `.env.local`), demo mode, scripts table, unit test notes, deploy steps, and an architecture pointer. The `test:integration` script reference was pulled back to a "landing soon" note after code review flagged the missing script — `npm run test` is the only documented command today.
Blocked by:

## Question

README is still the Vite template. Rewrite it for the real product: what Ask Leadership is, how to run it (install, `.env.example` → `.env.local`, `npm run dev`), demo mode (`VITE_DEMO_MODE=true`), how to run the block/tests (`npm run test`, emulator command once it exists), deployment (`firebase deploy`), and pointers to `ARCHITECTURE.md`/`CONTEXT.md`. Keep it honest and current with the features built in this effort.