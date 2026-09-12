import React from 'react';

export function Pill({ children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-mono text-xs tracking-wider px-4 py-2 rounded-full border-2 border-ink bg-white text-ink font-bold shadow-hard-sm ${className}`}
    >
      {children}
    </span>
  );
}

export function TagPill({ children, variant = 'purple', className = '' }) {
  const variantClasses = {
    purple: 'bg-purple-tint text-purple-deep border-2 border-ink',
    sage: 'bg-sage-tint text-sage-deep border-2 border-ink',
    dark: 'bg-ink text-cream border-2 border-ink',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wider uppercase px-3.5 py-1.5 rounded-full font-bold ${variantClasses[variant] || variantClasses.purple} ${className}`}
    >
      {children}
    </span>
  );
}
