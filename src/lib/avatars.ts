// Same hub-served avatar set every GummyGum experience hotlinks.
export const GUMMYGUM_AVATAR_BASE_URL = 'https://gummygum.app/avatars';
export const AVATAR_IDS: string[] = Array.from({ length: 26 }, (_, i) => `av-${i + 1}`);
export const DEFAULT_AVATAR_ID = 'av-1';
export const isAvatarId = (id: string | null | undefined): id is string => !!id && AVATAR_IDS.includes(id);
export const avatarUrl = (id: string | null | undefined): string =>
  `${GUMMYGUM_AVATAR_BASE_URL}/${isAvatarId(id) ? id : DEFAULT_AVATAR_ID}.svg`;

export function randomAvatarId(): string {
  return AVATAR_IDS[Math.floor(Math.random() * AVATAR_IDS.length)];
}
