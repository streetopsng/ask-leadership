import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';

const SESSIONS = 'sessions';

function sessionRef(id) {
  return doc(db, SESSIONS, id);
}

function questionRef(sessionId, questionId) {
  return doc(db, SESSIONS, sessionId, 'questions', questionId);
}

function voteRef(sessionId, round, uid) {
  return doc(db, SESSIONS, sessionId, 'votes', `${round}_${uid}`);
}

/**
 * Creates a new session with hostUid, phase setup, and config.
 */
export async function createFirestoreSession(sessionId, hostUid, config) {
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
export async function getFirestoreSession(sessionId) {
  if (!isFirebaseConfigured()) return null;

  const snap = await getDoc(sessionRef(sessionId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Subscribes to real-time session changes.
 */
export function subscribeToFirestoreSession(sessionId, onUpdate, onError) {
  if (!isFirebaseConfigured() || !sessionId) return () => {};

  return onSnapshot(
    sessionRef(sessionId),
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate({ id: snapshot.id, ...snapshot.data() });
      }
    },
    onError
  );
}

/**
 * Submits a question to the questions subcollection.
 */
export async function submitFirestoreQuestion(sessionId, participantUid, question) {
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
 * Votes on a question. Creates a per-round marker doc to enforce one-vote-per-participant.
 */
export async function voteFirestoreQuestion(sessionId, questionId, round, participantUid) {
  if (!isFirebaseConfigured()) return false;

  const marker = voteRef(sessionId, round, participantUid);
  const markerSnap = await getDoc(marker);
  if (markerSnap.exists()) return false; // already voted this round

  await setDoc(marker, { votedFor: questionId, createdAt: serverTimestamp() });
  await updateDoc(questionRef(sessionId, questionId), {
    votes: increment(1),
  });

  return true;
}

/**
 * Marks a question as answered and advances phase to followup.
 */
export async function markFirestoreQuestionAnswered(sessionId, questionId) {
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
 * Updates session phase. Only callable by hostUid.
 */
export async function updateFirestoreSessionPhase(sessionId, uid, patch) {
  if (!isFirebaseConfigured()) return false;

  const snap = await getDoc(sessionRef(sessionId));
  if (!snap.exists() || snap.data().hostUid !== uid) return false;

  await updateDoc(sessionRef(sessionId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });

  return true;
}
