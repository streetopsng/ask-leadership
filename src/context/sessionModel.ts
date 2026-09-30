import type { Question, Session, SessionPhase } from '../types';
import { timestampMillis } from '../lib/timestamps';
import { DEFAULT_AVATAR_ID } from '../lib/avatars';

/**
 * Pure helpers for shaping questions in the session state.
 * No React, no Firebase — unit-testable in isolation.
 */

export function normalizeQuestion(raw: Partial<Question> & { id: string }): Question {
  return {
    id: raw.id,
    text: raw.text || '',
    votes: raw.votes || 0,
    answered: raw.answered || false,
    avatarId: raw.avatarId || DEFAULT_AVATAR_ID,
    participantUid: raw.participantUid ?? null,
  };
}

/**
 * Derives the `mine` flag for each question.
 * Server questions carry participantUid (matching the auth uid);
 * demo-mode questions carry an explicit `mine` instead.
 */
export function withMine(questions: Question[], myUid: string | null, myKey: string | null = null): Question[] {
  return questions.map((q) => ({
    ...q,
    mine:
      (!!myKey && q.participantKey === myKey) ||
      (q.participantUid != null ? q.participantUid === myUid : !!q.mine),
  }));
}

export const QUESTION_SUBMIT_COOLDOWN_MS = 10_000;

/** When the participant's own latest question (by server time, else local ts) stops blocking a new one. */
export function questionCooldownUntil(questions: Question[]): number | null {
  let latest = 0;
  for (const q of questions) {
    if (q.mine) latest = Math.max(latest, timestampMillis(q.createdAt) || q.ts || 0);
  }
  return latest ? latest + QUESTION_SUBMIT_COOLDOWN_MS : null;
}

// Capped so a client clock running behind the server can't stretch the wait past one window.
export function cooldownRemainingMs(until: number | null, now: number): number {
  if (!until) return 0;
  return Math.min(QUESTION_SUBMIT_COOLDOWN_MS, Math.max(0, until - now));
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
export function applyQuestionSnapshot(prev: Question[], incoming: Question[]): Question[] {
  const incomingById = new Map(incoming.map((q) => [q.id, q]));
  const pending = prev.filter((q) => q.pending && !incomingById.has(q.id));
  return [...pending, ...incoming.map((q) => incomingById.get(q.id)!)];
}

export const LOBBY_IDLE_MS = 20 * 60 * 1000;
// Hours, not the lobby's 20 min: a slow live Q&A must never be cut off.
export const ABANDON_THRESHOLD_MS = 3 * 60 * 60 * 1000;

const IN_PROGRESS_PHASES: SessionPhase[] = ['submitting', 'closed', 'voting', 'winner', 'answering', 'followup'];

export function isLobbyIdleExpired(phase: SessionPhase | undefined, createdAtMs: number, now: number): boolean {
  return phase === 'setup' && createdAtMs > 0 && now - createdAtMs >= LOBBY_IDLE_MS;
}

export function isAbandonedInProgress(phase: SessionPhase | undefined, lastActivityMs: number, now: number): boolean {
  return !!phase && IN_PROGRESS_PHASES.includes(phase) && lastActivityMs > 0 && now - lastActivityMs >= ABANDON_THRESHOLD_MS;
}

// The hub reuses the PIN when a session is re-run, so the doc may belong to an earlier hosted session.
export function isFromEarlierSession(session: Session | null, hostedSessionId: string | null | undefined, now: number): boolean {
  if (!session || !hostedSessionId) return false;
  if (session.hostedSessionId) return session.hostedSessionId !== hostedSessionId;
  const lastActivity = Math.max(
    timestampMillis(session.lastActivity),
    timestampMillis(session.updatedAt),
    timestampMillis(session.createdAt)
  );
  return (
    session.phase === 'ended' ||
    !!session.abandoned ||
    isLobbyIdleExpired(session.phase, timestampMillis(session.createdAt), now) ||
    isAbandonedInProgress(session.phase, lastActivity, now)
  );
}
