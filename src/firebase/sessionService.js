import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';

const SESSIONS_COLLECTION = 'sessions';

/**
 * Creates a new Ask Leadership session in Firestore
 */
export async function createFirestoreSession(sessionData) {
  if (!isFirebaseConfigured()) return null;

  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionData.id);
  await setDoc(sessionRef, {
    ...sessionData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return sessionData.id;
}

/**
 * Subscribes to real-time session changes
 */
export function subscribeToFirestoreSession(sessionId, onUpdate, onError) {
  if (!isFirebaseConfigured() || !sessionId) return () => {};

  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  return onSnapshot(
    sessionRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data());
      }
    },
    onError
  );
}

/**
 * Submits a new anonymous question to the session
 */
export async function submitFirestoreQuestion(sessionId, question) {
  if (!isFirebaseConfigured()) return false;

  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await updateDoc(sessionRef, {
    questions: arrayUnion(question),
    updatedAt: serverTimestamp(),
  });
  return true;
}

/**
 * Updates the session phase and status
 */
export async function updateFirestoreSessionPhase(sessionId, phasePatch) {
  if (!isFirebaseConfigured()) return false;

  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await updateDoc(sessionRef, {
    ...phasePatch,
    updatedAt: serverTimestamp(),
  });
  return true;
}

/**
 * Upvotes a question
 */
export async function voteFirestoreQuestion(sessionId, questionId, currentQuestions) {
  if (!isFirebaseConfigured()) return false;

  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  const updatedQuestions = currentQuestions.map((q) =>
    q.id === questionId ? { ...q, votes: (q.votes || 0) + 1 } : q
  );

  await updateDoc(sessionRef, {
    questions: updatedQuestions,
    updatedAt: serverTimestamp(),
  });
  return true;
}

/**
 * Marks a question as answered
 */
export async function markFirestoreQuestionAnswered(sessionId, questionId, currentQuestions) {
  if (!isFirebaseConfigured()) return false;

  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  const updatedQuestions = currentQuestions.map((q) =>
    q.id === questionId ? { ...q, answered: true } : q
  );

  await updateDoc(sessionRef, {
    questions: updatedQuestions,
    phase: 'followup',
    updatedAt: serverTimestamp(),
  });
  return true;
}
