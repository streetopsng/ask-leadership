import React from 'react';

const BAR_HEIGHTS = ['40%', '100%', '60%', '85%', '50%', '70%', '90%', '55%', '75%'];

export default function Waveform({ count = 6, variant = 'sage', size = 'default', className = '' }) {
  const bgClasses = {
    sage: 'bg-sage',
    voice: 'bg-brand-purple',
    gold: 'bg-gold',
  };

  const containerHeight = size === 'lg' ? 'h-[52px]' : 'h-[22px]';
  const barWidth = size === 'lg' ? 'w-2' : 'w-[5px]';

  const barDelayStyles = [
    { animationDelay: '0s' },
    { animationDelay: '0.12s' },
    { animationDelay: '0.24s' },
    { animationDelay: '0.36s' },
    { animationDelay: '0.48s' },
    { animationDelay: '0.6s' },
    { animationDelay: '0.72s' },
    { animationDelay: '0.84s' },
    { animationDelay: '0.96s' },
  ];

  return (
    <div className={`flex items-end gap-1 ${containerHeight} ${className}`}>
      {Array.from({ length: count }).map((_, i) => {
        const heightPercent = BAR_HEIGHTS[i % BAR_HEIGHTS.length];
        const delay = barDelayStyles[i % barDelayStyles.length];
        return (
          <span
            key={i}
            className={`${barWidth} rounded-xs border-[1.5px] border-ink animate-bar ${bgClasses[variant] || bgClasses.sage}`}
            style={{ height: heightPercent, ...delay }}
          />
        );
      })}
    </div>
  );
}
