import { getDatabase, ref, set, remove, onDisconnect, onValue, type DatabaseReference } from 'firebase/database';
import { isFirebaseConfigured } from './config';

let rtdb: ReturnType<typeof getDatabase> | null = null;

function getDb() {
  if (!rtdb) rtdb = getDatabase();
  return rtdb;
}

// A keyed participant writes their key so several devices for one invitee count once.
export async function goOnline(sessionId: string, uid: string, participantKey?: string | null): Promise<void> {
  if (!isFirebaseConfigured()) return;

  const presenceRef: DatabaseReference = ref(getDb(), `presence/${sessionId}/${uid}`);
  await set(presenceRef, participantKey || true);
  await onDisconnect(presenceRef).remove();
}

export async function goOffline(sessionId: string, uid: string): Promise<void> {
  if (!isFirebaseConfigured()) return;

  const presenceRef: DatabaseReference = ref(getDb(), `presence/${sessionId}/${uid}`);
  await remove(presenceRef);
}

export function subscribeToPresence(sessionId: string, onUpdate: (count: number) => void, excludeUid?: string | null): () => void {
  if (!isFirebaseConfigured()) return () => {};

  const presenceRef: DatabaseReference = ref(getDb(), `presence/${sessionId}`);
  return onValue(presenceRef, (snapshot) => {
    onUpdate(countPresence(snapshot.val() as Record<string, unknown> | null, excludeUid));
  });
}

export function countPresence(data: Record<string, unknown> | null, excludeUid?: string | null): number {
  if (!data) return 0;
  return new Set(Object.entries(data).filter(([uid]) => uid !== excludeUid).map(([uid, value]) => (typeof value === 'string' && value ? `k:${value}` : `u:${uid}`))).size;
}
