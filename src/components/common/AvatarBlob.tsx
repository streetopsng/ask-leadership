import { getAvatarById } from '../../constants/avatars';
import type { AvatarSize } from '../../types';

const AVATAR_BG_CLASSES: Record<string, string> = {
  panda: 'bg-[#EDE4F5]',
  fox: 'bg-[#E3A6C7]',
  octopus: 'bg-[#B79BDD]',
  lion: 'bg-[#F0C55E]',
  frog: 'bg-[#7FC79E]',
  koala: 'bg-[#A9A0DE]',
  tiger: 'bg-[#E0A94A]',
  bear: 'bg-[#A8D9BC]',
  unicorn: 'bg-[#E7B8DD]',
  monkey: 'bg-[#E0C67A]',
};

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'w-8 h-8 text-base border-2',
  md: 'w-10 h-10 text-xl border-[2.5px]',
  lg: 'w-12 h-12 text-2xl border-[2.5px]',
  xl: 'w-16 h-16 text-3xl border-[2.5px]',
};

interface AvatarBlobProps {
  avatarId: string | null;
  size?: AvatarSize;
  className?: string;
}

export default function AvatarBlob({ avatarId, size = 'md', className = '' }: AvatarBlobProps) {
  const avatar = getAvatarById(avatarId ?? 'panda');
  const bgClass = AVATAR_BG_CLASSES[avatar.id] || 'bg-[#EDE4F5]';
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full border-ink shrink-0 select-none ${sizeClass} ${bgClass} ${className}`}
      title={avatar.name}
    >
      {avatar.emoji}
    </div>
  );
}
