import type { Avatar } from '../types';

export const AVATARS: Avatar[] = [
  { id: 'panda', emoji: '🐼', color: '#EDE4F5', name: 'Panda' },
  { id: 'fox', emoji: '🦊', color: '#E3A6C7', name: 'Fox' },
  { id: 'octopus', emoji: '🐙', color: '#B79BDD', name: 'Octopus' },
  { id: 'lion', emoji: '🦁', color: '#F0C55E', name: 'Lion' },
  { id: 'frog', emoji: '🐸', color: '#7FC79E', name: 'Frog' },
  { id: 'koala', emoji: '🐨', color: '#A9A0DE', name: 'Koala' },
  { id: 'tiger', emoji: '🐯', color: '#E0A94A', name: 'Tiger' },
  { id: 'bear', emoji: '🐻', color: '#A8D9BC', name: 'Bear' },
  { id: 'unicorn', emoji: '🦄', color: '#E7B8DD', name: 'Unicorn' },
  { id: 'monkey', emoji: '🐵', color: '#E0C67A', name: 'Monkey' },
];

export function getAvatarById(id: string): Avatar {
  return AVATARS.find(a => a.id === id) || AVATARS[0];
}
