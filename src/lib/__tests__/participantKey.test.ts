import { describe, it, expect } from 'vitest';
import { inviteParticipantKey } from '../participantKey';

describe('inviteParticipantKey', () => {
  it('is stable for the same invite email regardless of case and whitespace', async () => {
    const a = await inviteParticipantKey('AL-ABC123', 'hs1', 'Ada@Example.com');
    const b = await inviteParticipantKey('AL-ABC123', 'hs1', '  ada@example.com ');
    expect(a).toBeTruthy();
    expect(a).toBe(b);
  });

  it('differs per email and per hosted run, and is null without an email', async () => {
    const base = await inviteParticipantKey('AL-ABC123', 'hs1', 'ada@example.com');
    expect(await inviteParticipantKey('AL-ABC123', 'hs1', 'bob@example.com')).not.toBe(base);
    expect(await inviteParticipantKey('AL-ABC123', 'hs2', 'ada@example.com')).not.toBe(base);
    expect(await inviteParticipantKey('AL-ABC123', 'hs1', '  ')).toBeNull();
  });
});
