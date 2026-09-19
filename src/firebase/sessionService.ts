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
  writeBatch,
  type DocumentData,
  type DocumentSnapshot,
  type QuerySnapshot,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import type { Session, Question, VoteMarker, SessionConfig } from '../types';

const SESSIONS = 'sessions';

function sessionRef(id: string) {
  return doc(db!, SESSIONS, id);
}

function questionRef(sessionId: string, questionId: string) {
  return doc(db!, SESSIONS, sessionId, 'questions', questionId);
}

function voteRef(sessionId: string, round: number, uid: string) {
  return doc(db!, SESSIONS, sessionId, 'votes', `${round}_${uid}`);
}

/**
 * Creates a new session with hostUid, phase setup, and config.
 */
export async function createFirestoreSession(
  sessionId: string,
  hostUid: string,
  config: SessionConfig
): Promise<string | null> {
  if (!isFirebaseConfigured()) return null;

  await setDoc(sessionRef(sessionId), {
    hostUid,
    phase: 'setup',
    round: 1,
    currentQuestionId: null,
    config,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return sessionId;
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

/**
 * Subscribes to the caller's own vote marker for the current round,
 * so a client knows whether it has voted this round and for what.
 */
export function subscribeToMyVote(
  sessionId: string,
  round: number,
  uid: string,
  onUpdate: (marker: VoteMarker | null) => void,
  onError: (err: Error) => void
): () => void {
  if (!isFirebaseConfigured() || !sessionId || !round || !uid) return () => {};

  return onSnapshot(
    voteRef(sessionId, round, uid),
    (snapshot: DocumentSnapshot<DocumentData>) => {
      onUpdate(snapshot.exists() ? { votedFor: snapshot.data()!.votedFor } as VoteMarker : null);
    },
    onError
  );
}

/**
 * Submits a question to the questions subcollection.
 */
export async function submitFirestoreQuestion(
  sessionId: string,
  participantUid: string,
  question: Pick<Question, 'id' | 'text' | 'avatarId'>
): Promise<boolean> {
  if (!isFirebaseConfigured()) return false;

  await setDoc(questionRef(sessionId, question.id), {
    text: question.text,
    participantUid,
    avatarId: question.avatarId,
    votes: 0,
    answered: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return true;
}

/**
 * Votes on a question. Uses a transaction to atomically check the marker and increment votes.
 */
export async function voteFirestoreQuestion(
  sessionId: string,
  questionId: string,
  round: number,
  participantUid: string
): Promise<boolean> {
  if (!isFirebaseConfigured()) return false;

  const marker = voteRef(sessionId, round, participantUid);
  const qRef = questionRef(sessionId, questionId);

  try {
    await runTransaction(db!, async (tx) => {
      const markerSnap = await tx.get(marker);
      if (markerSnap.exists()) throw new Error('ALREADY_VOTED');

      tx.set(marker, { votedFor: questionId, createdAt: serverTimestamp() });
      tx.update(qRef, { votes: increment(1) });
    });
    return true;
  } catch (err) {
    if ((err as Error).message === 'ALREADY_VOTED') return false;
    throw err;
  }
}

/**
 * Marks a question as answered and advances phase to followup.
 */
export async function markFirestoreQuestionAnswered(
  sessionId: string,
  questionId: string
): Promise<boolean> {
  if (!isFirebaseConfigured()) return false;

  await updateDoc(questionRef(sessionId, questionId), {
    answered: true,
  });

  await updateDoc(sessionRef(sessionId), {
    phase: 'followup',
    updatedAt: serverTimestamp(),
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
  });

  return true;
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
