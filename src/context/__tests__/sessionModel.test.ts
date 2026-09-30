import { describe, it, expect } from 'vitest';
import {
  normalizeQuestion,
  withMine,
  applyQuestionSnapshot,
  isLobbyIdleExpired,
  isAbandonedInProgress,
  LOBBY_IDLE_MS,
  questionCooldownUntil,
  cooldownRemainingMs,
  QUESTION_SUBMIT_COOLDOWN_MS,
  ABANDON_THRESHOLD_MS,
} from '../sessionModel';

describe('normalizeQuestion', () => {
  it('maps a raw Firestore question doc into the client shape', () => {
    expect(
      normalizeQuestion({
        id: 'q1',
        text: 'Why?',
        votes: 3,
        answered: true,
        avatarId: 'cat',
        participantUid: 'user-abc',
      })
    ).toEqual({
      id: 'q1',
      text: 'Why?',
      votes: 3,
      answered: true,
      avatarId: 'cat',
      participantUid: 'user-abc',
    });
  });

  it('fills defaults for missing fields', () => {
    expect(normalizeQuestion({ id: 'q2' })).toEqual({
      id: 'q2',
      text: '',
      votes: 0,
      answered: false,
      avatarId: 'av-1',
      participantUid: null,
    });
  });
});

describe('withMine', () => {
  it('marks questions authored by my uid as mine', () => {
    const list = [
      normalizeQuestion({ id: 'a', participantUid: 'me' }),
      normalizeQuestion({ id: 'b', participantUid: 'other' }),
    ];
    const result = withMine(list, 'me');
    expect(result[0].mine).toBe(true);
    expect(result[1].mine).toBe(false);
  });

  it('keeps an explicit mine flag when there is no participantUid (demo mode)', () => {
    const list = [
      { ...normalizeQuestion({ id: 'x' }), mine: true },
      { ...normalizeQuestion({ id: 'y' }), mine: false },
    ];
    const result = withMine(list, null);
    expect(result[0].mine).toBe(true);
    expect(result[1].mine).toBe(false);
  });

  it('marks a returning invitee\'s questions from another device as mine via their participant key', () => {
    const list = [
      { ...normalizeQuestion({ id: 'a', participantUid: 'old-device' }), participantKey: 'k1' },
      { ...normalizeQuestion({ id: 'b', participantUid: 'someone' }), participantKey: 'k2' },
    ];
    const result = withMine(list, 'new-device', 'k1');
    expect(result[0].mine).toBe(true);
    expect(result[1].mine).toBe(false);
  });
});

describe('applyQuestionSnapshot', () => {
  it('drops server-deleted questions and keeps confirmed ones in server order', () => {
    const prev = [
      normalizeQuestion({ id: 'gone', text: 'moderated away' }),
      normalizeQuestion({ id: 'keep', text: 'still here', votes: 1 }),
    ];
    const incoming = [
      normalizeQuestion({ id: 'keep', text: 'still here', votes: 2 }),
      normalizeQuestion({ id: 'new', text: 'just arrived' }),
    ];
    const result = applyQuestionSnapshot(prev, incoming);
    expect(result.map((q) => q.id)).toEqual(['keep', 'new']);
    expect(result.find((q) => q.id === 'keep')?.votes).toBe(2);
    expect(result.find((q) => q.id === 'gone')).toBeUndefined();
  });

  it('keeps a pending optimistic question the server has not echoed yet', () => {
    const prev = [
      { ...normalizeQuestion({ id: 'local', text: 'just submitted' }), pending: true },
      normalizeQuestion({ id: 'old', text: 'older' }),
    ];
    const incoming = [normalizeQuestion({ id: 'old', text: 'older' })];
    const result = applyQuestionSnapshot(prev, incoming);
    expect(result.map((q) => q.id)).toEqual(['local', 'old']);
  });

  it('swaps a pending question for its server copy once echoed', () => {
    const prev = [{ ...normalizeQuestion({ id: 'local', text: 'just submitted' }), pending: true }];
    const incoming = [normalizeQuestion({ id: 'local', text: 'just submitted', votes: 3 })];
    const result = applyQuestionSnapshot(prev, incoming);
    expect(result).toHaveLength(1);
    expect(result[0].votes).toBe(3);
    expect(result[0].pending).toBeUndefined();
  });

  it('drops a question once the server deletes it', () => {
    const prev = [normalizeQuestion({ id: 'removed', text: 'moderated' })];
    const result = applyQuestionSnapshot(prev, []);
    expect(result).toEqual([]);
  });
});

describe('session expiry', () => {
  const now = 10 * ABANDON_THRESHOLD_MS;

  it('expires only a setup-phase lobby idle for 20 minutes', () => {
    expect(isLobbyIdleExpired('setup', now - LOBBY_IDLE_MS, now)).toBe(true);
    expect(isLobbyIdleExpired('setup', now - LOBBY_IDLE_MS + 1, now)).toBe(false);
    expect(isLobbyIdleExpired('voting', 1, now)).toBe(false);
    expect(isLobbyIdleExpired('setup', 0, now)).toBe(false);
  });

  it('flags only in-progress phases with no activity for the threshold', () => {
    expect(isAbandonedInProgress('voting', now - ABANDON_THRESHOLD_MS, now)).toBe(true);
    expect(isAbandonedInProgress('voting', now - ABANDON_THRESHOLD_MS + 1, now)).toBe(false);
    expect(isAbandonedInProgress('setup', 1, now)).toBe(false);
    expect(isAbandonedInProgress('ended', 1, now)).toBe(false);
  });
});

describe('question cooldown', () => {
  const q = (over: Record<string, unknown>) =>
    ({ id: 'x', text: 't', avatarId: 'cat', votes: 0, answered: false, participantUid: null, ...over }) as never;

  it('derives from the latest own question by server timestamp, ignoring others', () => {
    const until = questionCooldownUntil([
      q({ id: 'a', mine: true, createdAt: { toMillis: () => 1_000 } }),
      q({ id: 'b', mine: true, createdAt: { toMillis: () => 5_000 } }),
      q({ id: 'c', mine: false, createdAt: { toMillis: () => 9_000 } }),
    ]);
    expect(until).toBe(5_000 + QUESTION_SUBMIT_COOLDOWN_MS);
  });

  it('follows a keyed participant onto another device via withMine', () => {
    const feed = [q({ participantUid: 'old-device', participantKey: 'k1', createdAt: { toMillis: () => 2_000 } })];
    expect(questionCooldownUntil(withMine(feed, 'new-device', 'k1'))).toBe(2_000 + QUESTION_SUBMIT_COOLDOWN_MS);
    expect(questionCooldownUntil(withMine(feed, 'new-device', null))).toBeNull();
  });

  it('falls back to the local ts for an unconfirmed question', () => {
    expect(questionCooldownUntil([q({ mine: true, ts: 3_000 })])).toBe(3_000 + QUESTION_SUBMIT_COOLDOWN_MS);
  });

  it('caps remaining time at one window when the local clock lags', () => {
    expect(cooldownRemainingMs(null, 0)).toBe(0);
    expect(cooldownRemainingMs(15_000, 10_000)).toBe(5_000);
    expect(cooldownRemainingMs(100_000, 0)).toBe(QUESTION_SUBMIT_COOLDOWN_MS);
    expect(cooldownRemainingMs(5_000, 10_000)).toBe(0);
  });
});
