# 07 - Host answering flow (moveToAnswering)

Type: task
Status: open
Blocked by: 06

## Question

`moveToAnswering`/`markAnswered`/`nextQuestion` already exist and are wired in `HostControlView`, but the phase transitions must flow correctly across **all** clients once real-time sync lands.

**Decision**: close every gap against the real-time stream — the host's winner pick reaches participants (`winner` phase shows `currentQuestion`), `answering` displays the live question, `markAnswered` persists + streams to everyone (`followup`), and `nextQuestion` rolls to a fresh voting round or ends. Optimistic local phase bumps stay (snappy host UX) but must reconcile with remote truth. Covered by the lifecycle emulator test (ticket 12).