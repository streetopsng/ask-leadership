import Button from './Button';
import StageFrame from './StageFrame';
import Waveform from './Waveform';

interface InitializationFallbackProps {
  state: 'signingIn' | 'joining' | 'authError' | 'joinError';
  onRetry: () => void;
}

export default function InitializationFallback({ state, onRetry }: InitializationFallbackProps) {
  const loading = state === 'signingIn' || state === 'joining';
  const joining = state === 'joining' || state === 'joinError';

  return (
    <main className="min-h-screen bg-cream px-6 py-10 flex items-center">
      <StageFrame className="text-center">
        <p className="font-mono text-xs uppercase tracking-wider font-bold text-purple-deep">Ask Leadership</p>
        <h1 className="font-display font-black text-3xl sm:text-4xl text-ink uppercase tracking-tight mt-4">
          {loading ? (joining ? 'Joining the Session...' : 'Signing you in...') : (joining ? 'We could not join this Session.' : 'We could not sign you in.')}
        </h1>
        <p className="font-body font-semibold text-muted-ink mt-3 max-w-lg mx-auto">
          {loading ? 'Your identity remains anonymous.' : 'Check your connection and try again. Your identity remains anonymous.'}
        </p>
        <div className="flex justify-center mt-7 min-h-[52px] items-center">
          {loading ? <Waveform size="lg" variant="voice" /> : <Button variant="primary" onClick={onRetry}>Try again</Button>}
        </div>
      </StageFrame>
    </main>
  );
}
