import { avatarUrl } from '../../lib/avatars';
import type { AvatarSize } from '../../types';

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'w-8 h-8 border-2',
  md: 'w-10 h-10 border-[2.5px]',
  lg: 'w-12 h-12 border-[2.5px]',
  xl: 'w-16 h-16 border-[2.5px]',
};

interface AvatarBlobProps {
  avatarId: string | null;
  size?: AvatarSize;
  className?: string;
}

export default function AvatarBlob({ avatarId, size = 'md', className = '' }: AvatarBlobProps) {
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  return (
    <img
      src={avatarUrl(avatarId)}
      alt=""
      draggable={false}
      className={`rounded-full border-ink bg-cream-2 object-cover shrink-0 select-none ${sizeClass} ${className}`}
    />
  );
}
