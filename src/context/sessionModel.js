/**
 * Pure helpers for shaping questions in the session state.
 * No React, no Firebase — unit-testable in isolation.
 */

export function normalizeQuestion(raw) {
  return {
    id: raw.id,
    text: raw.text || '',
    votes: raw.votes || 0,
    answered: raw.answered || false,
    avatarId: raw.avatarId || 'panda',
    participantUid: raw.participantUid ?? null,
  };
}

/**
 * Derives the `mine` flag for each question.
 * Server questions carry participantUid (matching the auth uid);
 * demo-mode questions carry an explicit `mine` instead.
 */
export function withMine(questions, myUid) {
  return questions.map((q) => ({
    ...q,
    mine: q.participantUid != null ? q.participantUid === myUid : !!q.mine,
  }));
}

/**
 * Reconciles the local question list with the latest server snapshot.
 * The server is canonical: questions deleted (or moderated) on the server
 * disappear here too, and confirmed items are swapped for their
 * server-echoed copies. The one exception is locally-optimistic questions
 * flagged `pending` that the server has not echoed yet — those survive the
 * merge so a just-submitted question doesn't flicker out before its write
 * lands. New server questions are appended newest-first after pending ones.
 */
export function applyQuestionSnapshot(prev, incoming) {
  const incomingById = new Map(incoming.map((q) => [q.id, q]));
  const pending = prev.filter((q) => q.pending && !incomingById.has(q.id));
  return [...pending, ...incoming.map((q) => incomingById.get(q.id))];
}