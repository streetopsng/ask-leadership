import { useEffect, useState } from 'react';
import StageFrame from './StageFrame';
import Waveform from './Waveform';

export default function LoadingScreen() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const slow = setTimeout(() => setStage(1), 8000);
    const verySlow = setTimeout(() => setStage(2), 20000);
    return () => {
      clearTimeout(slow);
      clearTimeout(verySlow);
    };
  }, []);
  const message =
    stage === 2
      ? "This is taking longer than usual — check your internet connection. We'll keep trying."
      : stage === 1
        ? 'Still connecting… please wait'
        : 'Loading…';

  return (
    <main className="min-h-screen bg-cream px-6 py-10 flex items-center" role="status">
      <StageFrame className="text-center">
        <p className="font-mono text-xs uppercase tracking-wider font-bold text-purple-deep">Ask Leadership</p>
        <div className="flex justify-center mt-6 min-h-[52px] items-center">
          <Waveform size="lg" variant="voice" />
        </div>
        <p className="font-body font-semibold text-muted-ink mt-4 max-w-lg mx-auto">{message}</p>
      </StageFrame>
    </main>
  );
}
