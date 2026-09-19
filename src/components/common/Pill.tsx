import { type ReactNode } from 'react';
import type { TagPillVariant } from '../../types';

interface PillProps {
  children: ReactNode;
  className?: string;
}

export function Pill({ children, className = '' }: PillProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-mono text-xs tracking-wider px-4 py-2 rounded-full border-2 border-ink bg-white text-ink font-bold shadow-hard-sm ${className}`}
    >
      {children}
    </span>
  );
}

interface TagPillProps {
  children: ReactNode;
  variant?: TagPillVariant;
  className?: string;
}

export function TagPill({ children, variant = 'purple', className = '' }: TagPillProps) {
  const variantClasses: Record<TagPillVariant, string> = {
    purple: 'bg-purple-tint text-purple-deep border-2 border-ink',
    sage: 'bg-sage-tint text-sage-deep border-2 border-ink',
    dark: 'bg-ink text-cream border-2 border-ink',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wider uppercase px-3.5 py-1.5 rounded-full font-bold ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
