import { getDatabase, ref, set, remove, onDisconnect, onValue, type DatabaseReference } from 'firebase/database';
import { isFirebaseConfigured } from './config';

let rtdb: ReturnType<typeof getDatabase> | null = null;

function getDb() {
  if (!rtdb) rtdb = getDatabase();
  return rtdb;
}

export async function goOnline(sessionId: string, uid: string): Promise<void> {
  if (!isFirebaseConfigured()) return;

  const presenceRef: DatabaseReference = ref(getDb(), `presence/${sessionId}/${uid}`);
  await set(presenceRef, true);
  await onDisconnect(presenceRef).remove();
}

export async function goOffline(sessionId: string, uid: string): Promise<void> {
  if (!isFirebaseConfigured()) return;

  const presenceRef: DatabaseReference = ref(getDb(), `presence/${sessionId}/${uid}`);
  await remove(presenceRef);
}

export function subscribeToPresence(sessionId: string, onUpdate: (count: number) => void): () => void {
  if (!isFirebaseConfigured()) return () => {};

  const presenceRef: DatabaseReference = ref(getDb(), `presence/${sessionId}`);
  return onValue(presenceRef, (snapshot) => {
    const data = snapshot.val() as Record<string, boolean> | null;
    const count = data ? Object.keys(data).length : 0;
    onUpdate(count);
  });
}
