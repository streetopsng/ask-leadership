import { describe, it, expect } from 'vitest';
import { normalizeQuestion, withMine, applyQuestionSnapshot } from '../sessionModel';

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
      avatarId: 'panda',
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
