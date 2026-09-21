import { type ReactNode } from 'react';

interface StageFrameProps {
  children: ReactNode;
  className?: string;
}

export default function StageFrame({ children, className = '' }: StageFrameProps) {
  return (
    <div
      className={`relative border-[2.5px] border-purple-deep rounded-3xl bg-cream-2 px-6 py-10 sm:px-10 sm:py-12 md:px-14 md:py-14 max-w-3xl mx-auto stage-frame-polygon ${className}`}
    >
      {/* Top striped tab */}
      <span className="absolute top-3.5 left-1/2 -translate-x-1/2 w-16 h-2 stage-frame-stripes rounded-xs" />

      {/* Bottom striped tab */}
      <span className="absolute bottom-3.5 left-1/2 -translate-x-1/2 w-16 h-2 stage-frame-stripes rounded-xs" />

      {/* Top Left Dots */}
      <span className="absolute top-3.5 left-4.5 flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-deep" />
        <span className="w-1.5 h-1.5 rounded-full bg-purple-deep" />
        <span className="w-1.5 h-1.5 rounded-full bg-purple-deep" />
      </span>

      {/* Top Right Dots */}
      <span className="absolute top-3.5 right-4.5 flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-deep" />
        <span className="w-1.5 h-1.5 rounded-full bg-purple-deep" />
        <span className="w-1.5 h-1.5 rounded-full bg-purple-deep" />
      </span>

      {/* Bottom Left Dots */}
      <span className="absolute bottom-3.5 left-4.5 flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-deep" />
        <span className="w-1.5 h-1.5 rounded-full bg-purple-deep" />
        <span className="w-1.5 h-1.5 rounded-full bg-purple-deep" />
      </span>

      {/* Bottom Right Dots */}
      <span className="absolute bottom-3.5 right-4.5 flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-deep" />
        <span className="w-1.5 h-1.5 rounded-full bg-purple-deep" />
        <span className="w-1.5 h-1.5 rounded-full bg-purple-deep" />
      </span>

      {children}
    </div>
  );
}
