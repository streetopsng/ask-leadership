import { getDatabase, ref, set, remove, onValue } from 'firebase/database';
import { isFirebaseConfigured } from './config';

let rtdb = null;

function getDb() {
  if (!rtdb) rtdb = getDatabase();
  return rtdb;
}

export async function goOnline(sessionId, uid) {
  if (!isFirebaseConfigured()) return;

  const presenceRef = ref(getDb(), `presence/${sessionId}/${uid}`);
  await set(presenceRef, true);
  presenceRef.onDisconnect().remove();
}

export async function goOffline(sessionId, uid) {
  if (!isFirebaseConfigured()) return;

  const presenceRef = ref(getDb(), `presence/${sessionId}/${uid}`);
  await remove(presenceRef);
}

export function subscribeToPresence(sessionId, onUpdate) {
  if (!isFirebaseConfigured()) return () => {};

  const presenceRef = ref(getDb(), `presence/${sessionId}`);
  return onValue(presenceRef, (snapshot) => {
    const data = snapshot.val();
    const count = data ? Object.keys(data).length : 0;
    onUpdate(count);
  });
}
