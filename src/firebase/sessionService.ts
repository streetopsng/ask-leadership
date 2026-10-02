import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  increment,
  serverTimestamp,
  runTransaction,
  collection,
  query,
  orderBy,
  getDocs,
  where,
  startAfter,
  limit,
  writeBatch,
  getCountFromServer,
  type DocumentData,
  type DocumentSnapshot,
  type QuerySnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { timestampMillis } from '../lib/timestamps';
import { isAbandonedInProgress, QUESTION_SUBMIT_COOLDOWN_MS } from '../context/sessionModel';
import type { Session, Question, VoteMarker, SessionConfig } from '../types';

const SESSIONS = 'sessions';
const TTL_DAYS = 30;

function ttlDateFromNow(days = TTL_DAYS): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function sessionRef(id: string) {
  return doc(db!, SESSIONS, id);
}

function questionRef(sessionId: string, questionId: string) {
  return doc(db!, SESSIONS, sessionId, 'questions', questionId);
}

function rateLimitRef(sessionId: string, uid: string) {
  return doc(db!, SESSIONS, sessionId, 'rate_limits', uid);
}

// Votes can't be deleted (rules), so a re-run of the same PIN keys them by hosted session to start clean.
function voteRef(sessionId: string, round: number, uid: string, hostedSessionId?: string | null) {
  const suffix = hostedSessionId ? `_${hostedSessionId}` : '';
  return doc(db!, SESSIONS, sessionId, 'votes', `${round}_${uid}${suffix}`);
}

async function isQuestionRateLimited(sessionId: string, participantUid: string): Promise<boolean> {
  const ref = rateLimitRef(sessionId, participantUid);
  const snap = await getDoc(ref);
  if (!snap || typeof snap.exists !== 'function' || !snap.exists()) return false;

  const lastSubmissionAt = snap.data()?.lastSubmissionAt;
  if (!lastSubmissionAt) return false;

  return Date.now() - timestampMillis(lastSubmissionAt) < QUESTION_SUBMIT_COOLDOWN_MS;
}

// rate_limits is keyed by auth uid, so a keyed invitee on a second device is checked by their own questions.
async function isParticipantKeyRateLimited(sessionId: string, participantKey: string): Promise<boolean> {
  const snapshot: QuerySnapshot<DocumentData> = await getDocs(
    query(collection(db!, SESSIONS, sessionId, 'questions'), where('participantKey', '==', participantKey))
  );
  const latest = Math.max(0, ...snapshot.docs.map((d) => timestampMillis(d.data().createdAt)));
  return latest > 0 && Date.now() - latest < QUESTION_SUBMIT_COOLDOWN_MS;
}

/**
 * Creates a new session with hostUid, phase setup, and config.
 */
export async function createFirestoreSession(
  sessionId: string,
  hostUid: string,
  config: SessionConfig,
  hostedSessionId: string | null = null
): Promise<string | null> {
  if (!isFirebaseConfigured()) return null;

  await setDoc(sessionRef(sessionId), {
    hostUid,
    ...(hostedSessionId ? { hostedSessionId } : {}),
    phase: 'setup',
    round: 1,
    currentQuestionId: null,
    config,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    expireAt: ttlDateFromNow(),
  });

  return sessionId;
}

/**
 * Host-only (rules): removes an earlier run's questions after the session doc is reset for a new hosted session.
 */
export async function clearFirestoreQuestions(sessionId: string): Promise<void> {
  if (!isFirebaseConfigured()) return;

  const snapshot: QuerySnapshot<DocumentData> = await getDocs(collection(db!, SESSIONS, sessionId, 'questions'));
  for (let i = 0; i < snapshot.docs.length; i += 450) {
    const batch = writeBatch(db!);
    snapshot.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

/**
 * Fetches a session by ID (for join-by-code).
 */
export async function getFirestoreSession(sessionId: string): Promise<Session | null> {
  if (!isFirebaseConfigured()) return null;

  const snap: DocumentSnapshot<DocumentData> = await getDoc(sessionRef(sessionId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Session;
}

/**
 * Subscribes to real-time session changes.
 */
export function subscribeToFirestoreSession(
  sessionId: string,
  onUpdate: (data: Session) => void,
  onError: (err: Error) => void
): () => void {
  if (!isFirebaseConfigured() || !sessionId) return () => {};

  return onSnapshot(
    sessionRef(sessionId),
    (snapshot: DocumentSnapshot<DocumentData>) => {
      if (snapshot.exists()) {
        onUpdate({ id: snapshot.id, ...snapshot.data() } as Session);
      }
    },
    onError
  );
}

/**
 * Subscribes to the live questions feed. Streams raw question docs,
 * newest first, to every client that has joined the session.
 */
export function subscribeToFirestoreQuestions(
  sessionId: string,
  onUpdate: (questions: Question[]) => void,
  onError: (err: Error) => void
): () => void {
  if (!isFirebaseConfigured() || !sessionId) return () => {};

  const q = query(
    collection(db!, SESSIONS, sessionId, 'questions'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) =>
      onUpdate(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Question))),
    onError
  );
}

function votesCollection(sessionId: string) {
  return collection(db!, SESSIONS, sessionId, 'votes');
}

// Vote doc ids are `${round}_${uid}` plus `_${hostedSessionId}` on hub re-runs.
function isVoteForRound(voteId: string, round: number, hostedSessionId?: string | null): boolean {
  const [voteRound, , ...rest] = voteId.split('_');
  if (voteRound !== String(round)) return false;
  return hostedSessionId ? rest.join('_') === hostedSessionId : rest.length === 0;
}

async function hasKeyVotedThisRound(
  sessionId: string,
  round: number,
  participantKey: string,
  hostedSessionId?: string | null
): Promise<boolean> {
  const snapshot: QuerySnapshot<DocumentData> = await getDocs(
    query(votesCollection(sessionId), where('participantKey', '==', participantKey))
  );
  return snapshot.docs.some((d) => isVoteForRound(d.id, round, hostedSessionId));
}

/**
 * Subscribes to the caller's own vote marker for the current round,
 * so a client knows whether it has voted this round and for what.
 * With a participant key the marker may have been cast from another device.
 */
export function subscribeToMyVote(
  sessionId: string,
  round: number,
  uid: string,
  onUpdate: (marker: VoteMarker | null) => void,
  onError: (err: Error) => void,
  hostedSessionId?: string | null,
  participantKey?: string | null
): () => void {
  if (!isFirebaseConfigured() || !sessionId || !round || !uid) return () => {};

  if (participantKey) {
    return onSnapshot(
      query(votesCollection(sessionId), where('participantKey', '==', participantKey)),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const match = snapshot.docs.find((d) => isVoteForRound(d.id, round, hostedSessionId));
        onUpdate(match ? ({ votedFor: match.data().votedFor } as VoteMarker) : null);
      },
      onError
    );
  }

  return onSnapshot(
    voteRef(sessionId, round, uid, hostedSessionId),
    (snapshot: DocumentSnapshot<DocumentData>) => {
      onUpdate(snapshot.exists() ? { votedFor: snapshot.data()!.votedFor } as VoteMarker : null);
    },
    onError
  );
}

/**
 * The avatar a keyed participant already used this run, recovered from their own question or vote.
 */
export async function findParticipantAvatar(sessionId: string, participantKey: string): Promise<string | null> {
  if (!isFirebaseConfigured()) return null;

  for (const sub of ['questions', 'votes']) {
    const snapshot: QuerySnapshot<DocumentData> = await getDocs(
      query(collection(db!, SESSIONS, sessionId, sub), where('participantKey', '==', participantKey), limit(1))
    );
    const avatarId = snapshot.docs[0]?.data().avatarId;
    if (typeof avatarId === 'string' && avatarId) return avatarId;
  }
  return null;
}

/**
 * Submits a question to the questions subcollection.
 */
export async function submitFirestoreQuestion(
  sessionId: string,
  participantUid: string,
  question: Pick<Question, 'id' | 'text' | 'avatarId'>,
  participantKey?: string | null
): Promise<boolean> {
  if (!isFirebaseConfigured()) return false;

  if (await isQuestionRateLimited(sessionId, participantUid)) return false;
  if (participantKey && (await isParticipantKeyRateLimited(sessionId, participantKey))) return false;

  try {
    await runTransaction(db!, async (tx) => {
      const rateLimitSnap = await tx.get(rateLimitRef(sessionId, participantUid));
      if (rateLimitSnap.exists()) {
        const lastSubmissionAt = rateLimitSnap.data()?.lastSubmissionAt;
        if (lastSubmissionAt && Date.now() - timestampMillis(lastSubmissionAt) < QUESTION_SUBMIT_COOLDOWN_MS) {
          throw new Error('RATE_LIMITED');
        }
      }

      tx.set(questionRef(sessionId, question.id), {
        text: question.text,
        participantUid,
        ...(participantKey ? { participantKey } : {}),
        avatarId: question.avatarId,
        votes: 0,
        answered: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        expireAt: ttlDateFromNow(),
      });

      tx.set(rateLimitRef(sessionId, participantUid), {
        lastSubmissionAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        expireAt: ttlDateFromNow(),
      }, { merge: true });
    });

    return true;
  } catch (err) {
    if ((err as Error).message === 'RATE_LIMITED') return false;
    throw err;
  }
}

/**
 * Votes on a question. Uses a transaction to atomically check the marker and increment votes.
 */
export async function voteFirestoreQuestion(
  sessionId: string,
  questionId: string,
  round: number,
  participantUid: string,
  hostedSessionId?: string | null,
  participant?: { key: string; avatarId: string | null } | null
): Promise<boolean> {
  if (!isFirebaseConfigured()) return false;

  if (participant?.key && (await hasKeyVotedThisRound(sessionId, round, participant.key, hostedSessionId))) {
    return false;
  }

  const marker = voteRef(sessionId, round, participantUid, hostedSessionId);
  const qRef = questionRef(sessionId, questionId);

  try {
    await runTransaction(db!, async (tx) => {
      const markerSnap = await tx.get(marker);
      if (markerSnap.exists()) throw new Error('ALREADY_VOTED');

      tx.set(marker, {
        votedFor: questionId,
        ...(participant?.key ? { participantKey: participant.key, avatarId: participant.avatarId } : {}),
        createdAt: serverTimestamp(),
        expireAt: ttlDateFromNow(),
      });
      tx.update(qRef, { votes: increment(1), expireAt: ttlDateFromNow() });
    });
    return true;
  } catch (err) {
    if ((err as Error).message === 'ALREADY_VOTED') return false;
    throw err;
  }
}

/**
 * Marks a question as answered (recording the round) and advances phase to followup.
 */
export async function markFirestoreQuestionAnswered(
  sessionId: string,
  questionId: string,
  round: number
): Promise<boolean> {
  if (!isFirebaseConfigured()) return false;

  await updateDoc(questionRef(sessionId, questionId), {
    answered: true,
    answeredRound: round,
  });

  await updateDoc(sessionRef(sessionId), {
    phase: 'followup',
    updatedAt: serverTimestamp(),
    expireAt: ttlDateFromNow(),
  });

  return true;
}

/**
 * Deletes a question. Firestore rules restrict this to the host.
 */
export async function deleteFirestoreQuestion(
  sessionId: string,
  questionId: string
): Promise<boolean> {
  if (!isFirebaseConfigured()) return false;

  await deleteDoc(questionRef(sessionId, questionId));
  return true;
}

/**
 * Updates session phase. Only callable by hostUid.
 */
export async function updateFirestoreSessionPhase(
  sessionId: string,
  uid: string,
  patch: Partial<Pick<Session, 'phase' | 'round' | 'currentQuestionId'> & Record<string, unknown>>
): Promise<boolean> {
  if (!isFirebaseConfigured()) return false;

  const snap: DocumentSnapshot<DocumentData> = await getDoc(sessionRef(sessionId));
  if (!snap.exists() || snap.data()!.hostUid !== uid) return false;

  await updateDoc(sessionRef(sessionId), {
    ...patch,
    updatedAt: serverTimestamp(),
    // Firestore rejects undefined field values, so expireAt is only sent when it is set.
    ...(patch.phase === 'ended' ? { expireAt: ttlDateFromNow() } : {}),
  });

  return true;
}

/** True when mid-flow with no host heartbeat, phase change or new question for hours. */
export async function isFirestoreSessionAbandoned(sessionId: string): Promise<boolean> {
  if (!isFirebaseConfigured()) return false;

  const snap: DocumentSnapshot<DocumentData> = await getDoc(sessionRef(sessionId));
  if (!snap.exists()) return false;
  const data = snap.data()!;
  if (data.abandoned) return true;

  const latest: QuerySnapshot<DocumentData> = await getDocs(
    query(collection(db!, SESSIONS, sessionId, 'questions'), orderBy('createdAt', 'desc'), limit(1))
  );
  const lastActivity = Math.max(
    timestampMillis(data.lastActivity),
    timestampMillis(data.updatedAt),
    timestampMillis(data.createdAt),
    latest.docs[0] ? timestampMillis(latest.docs[0].data().createdAt) : 0
  );
  return isAbandonedInProgress(data.phase, lastActivity, Date.now());
}

/** Host-only (rules): liveness heartbeat so a connected host keeps the session from looking abandoned. */
export async function touchFirestoreSession(sessionId: string): Promise<void> {
  if (!isFirebaseConfigured()) return;
  await updateDoc(sessionRef(sessionId), { lastActivity: serverTimestamp() });
}

/** Host-only (rules): persists the abandoned flag so every client shows the expired modal. */
export async function markFirestoreSessionAbandoned(sessionId: string): Promise<void> {
  if (!isFirebaseConfigured()) return;
  await updateDoc(sessionRef(sessionId), { abandoned: true });
}

/**
 * Resets votes on all unanswered questions for a new round.
 */
export async function resetQuestionVotes(sessionId: string): Promise<boolean> {
  if (!isFirebaseConfigured()) return false;

  const snap: DocumentSnapshot<DocumentData> = await getDoc(sessionRef(sessionId));
  if (!snap.exists()) return false;

  const questionsRef = collection(db!, SESSIONS, sessionId, 'questions');
  const unanswered = query(questionsRef, where('answered', '==', false));
  const snapshot: QuerySnapshot<DocumentData> = await getDocs(unanswered);

  const batch = writeBatch(db!);
  snapshot.docs.forEach((d) => {
    batch.update(d.ref, { votes: 0 });
  });
  await batch.commit();

  return true;
}

export interface HostSessionSummary {
  session: Session;
  submitted: number;
  answered: number;
  unanswered: number;
}

export interface HostSessionPage {
  sessions: Session[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/**
 * Lists one page of sessions hosted by the given uid, newest first.
 * The cursor keeps the dashboard from loading every historical session at once.
 */
export async function listHostSessionsPage(
  hostUid: string,
  pageSize = 20,
  cursor?: QueryDocumentSnapshot<DocumentData>
): Promise<HostSessionPage> {
  if (!isFirebaseConfigured()) return { sessions: [], cursor: null, hasMore: false };

  const constraints = [
    where('hostUid', '==', hostUid),
    orderBy('createdAt', 'desc'),
    ...(cursor ? [startAfter(cursor)] : []),
    limit(pageSize),
  ];
  const snapshot: QuerySnapshot<DocumentData> = await getDocs(
    query(collection(db!, SESSIONS), ...constraints)
  );
  const sessions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Session);

  return {
    sessions,
    cursor: snapshot.docs.at(-1) ?? null,
    hasMore: snapshot.docs.length === pageSize,
  };
}

/**
 * Lists sessions hosted by the given uid, newest first.
 * Filters server-side on hostUid; sorts client-side so no composite
 * Firestore index is required.
 */
export async function listHostSessions(hostUid: string): Promise<Session[]> {
  if (!isFirebaseConfigured()) return [];

  const snapshot: QuerySnapshot<DocumentData> = await getDocs(
    query(collection(db!, SESSIONS), where('hostUid', '==', hostUid))
  );

  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as Session))
    .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt));
}

/**
 * Counts submitted and answered questions via aggregation queries —
 * totals only, no question text is transferred.
 */
export async function countSessionQuestions(
  sessionId: string
): Promise<{ submitted: number; answered: number }> {
  if (!isFirebaseConfigured()) return { submitted: 0, answered: 0 };

  const questionsRef = collection(db!, SESSIONS, sessionId, 'questions');
  const [all, answered] = await Promise.all([
    getCountFromServer(questionsRef),
    getCountFromServer(query(questionsRef, where('answered', '==', true))),
  ]);

  return { submitted: all.data().count, answered: answered.data().count };
}

/**
 * One summary per hosted session: the session plus submitted/answered/
 * unanswered totals. Totals only — never question text.
 */
export async function listHostSessionSummaries(hostUid: string): Promise<HostSessionSummary[]> {
  if (!isFirebaseConfigured()) return [];

  const sessions = await listHostSessions(hostUid);
  return Promise.all(
    sessions.map(async (session) => {
      const { submitted, answered } = await countSessionQuestions(session.id!);
      return { session, submitted, answered, unanswered: Math.max(0, submitted - answered) };
    })
  );
}

/**
 * Loads one dashboard page and its per-session question totals.
 */
export async function listHostSessionSummaryPage(
  hostUid: string,
  pageSize = 20,
  cursor?: QueryDocumentSnapshot<DocumentData>
): Promise<{ summaries: HostSessionSummary[]; cursor: QueryDocumentSnapshot<DocumentData> | null; hasMore: boolean }> {
  const page = await listHostSessionsPage(hostUid, pageSize, cursor);
  const summaries = await Promise.all(
    page.sessions.map(async (session) => {
      const { submitted, answered } = await countSessionQuestions(session.id!);
      return { session, submitted, answered, unanswered: Math.max(0, submitted - answered) };
    })
  );
  return { summaries, cursor: page.cursor, hasMore: page.hasMore };
}

/**
 * One-time read of a session's questions, newest first, for the
 * read-only summary/export view.
 */
export async function listFirestoreQuestions(sessionId: string): Promise<Question[]> {
  if (!isFirebaseConfigured()) return [];

  const snapshot: QuerySnapshot<DocumentData> = await getDocs(
    query(collection(db!, SESSIONS, sessionId, 'questions'), orderBy('createdAt', 'desc'))
  );

  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Question));
}

/**
 * Prevents the dashboard from opening a summary for a session it did not list
 * as hosted by the current anonymous identity. Firestore rules still govern
 * the underlying question read shared with the live join-by-code flow.
 */
export async function listFirestoreQuestionsForHost(
  sessionId: string,
  hostUid: string
): Promise<Question[]> {
  const session = await getFirestoreSession(sessionId);
  if (!session || session.hostUid !== hostUid) {
    throw new Error('Only the session host can open its summary');
  }
  return listFirestoreQuestions(sessionId);
}
