# 13 - Session templates (pre-built question sets)

Type: task
Status: open
Blocked by:

## Question

Hosts want starting points. **Decision**: pre-built question sets in `src/constants/templates.js` (e.g. Hybrid Work, Company Strategy, Leadership Style, Team Health). On session create the host picks a template; its questions seed the session as host-authored questions (`participantUid = host uid`, `answered: false`) so they appear in the live pool. Works in demo and Firebase modes. Templates are seed data for a fresh session, never appended mid-session.