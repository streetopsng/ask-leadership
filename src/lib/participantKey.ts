/**
 * A GummyGum invitee's stable identity for one hosted run, derived from their invite email so a
 * rejoin from any device reclaims the same questions, votes and presence while the room only
 * ever sees an opaque hash. Rules still key writes by auth uid; this rides alongside as a field.
 */
export async function inviteParticipantKey(
  code: string,
  hostedSessionId: string | null | undefined,
  email: string | null | undefined
): Promise<string | null> {
  const normalized = (email ?? '').trim().toLowerCase();
  if (!code || !normalized || !globalThis.crypto?.subtle) return null;
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`al:${code}:${hostedSessionId ?? ''}:${normalized}`)
  );
  return Array.from(new Uint8Array(digest).slice(0, 12), (b) => b.toString(16).padStart(2, '0')).join('');
}

const AVATAR_STORAGE_PREFIX = 'al:avatar:';

export function loadStoredAvatar(key: string): string | null {
  try {
    return localStorage.getItem(AVATAR_STORAGE_PREFIX + key);
  } catch {
    return null;
  }
}

export function storeAvatar(key: string, avatarId: string): void {
  try {
    localStorage.setItem(AVATAR_STORAGE_PREFIX + key, avatarId);
  } catch {
    // private mode: cross-device lookup still recovers it from the participant's own docs
  }
}
