import { useSession } from '../../context/SessionContext';
import Button from '../common/Button';
import Waveform from '../common/Waveform';
import StageFrame from '../common/StageFrame';

export default function ClosingView() {
  const {
    closingStep,
    setClosingStep,
    submittedCount,
    answeredCount,
    remainingCount,
    restartDemo,
  } = useSession();

  if (closingStep === 0 && remainingCount > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-cream">
        <div className="text-center w-full max-w-xl animate-rise">
          <StageFrame>
            <div className="font-mono text-xs uppercase tracking-wider font-bold text-purple-deep mb-2">
              We didn't get to everything.
            </div>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-ink leading-tight mb-6">
              These questions will go to leadership for follow-up.
            </h2>

            <div className="flex justify-center gap-4 flex-wrap my-6">
              <div className="bg-white border-2 border-ink rounded-xl p-4 min-w-[120px] shadow-hard-sm">
                <div className="font-display font-black text-3xl text-purple-deep">
                  {answeredCount}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-ink font-bold mt-1">
                  Answered live
                </div>
              </div>

              <div className="bg-white border-2 border-ink rounded-xl p-4 min-w-[120px] shadow-hard-sm">
                <div className="font-display font-black text-3xl text-purple-deep">
                  {remainingCount}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-ink font-bold mt-1">
                  Going to follow-up
                </div>
              </div>
            </div>

            <Button variant="primary" onClick={() => setClosingStep(1)}>
              Continue
            </Button>
          </StageFrame>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-cream">
      <div className="text-center w-full max-w-xl animate-rise">
        <StageFrame>
          <div className="flex justify-center mb-6">
            <Waveform count={7} variant="gold" />
          </div>

          <h1 className="font-display font-black text-4xl sm:text-5xl text-ink uppercase tracking-tight leading-none mb-6">
            You asked.
            <br />
            Leadership listened.
          </h1>

          <div className="flex justify-center gap-3.5 flex-wrap my-6">
            <div className="bg-white border-2 border-ink rounded-xl p-4 min-w-[110px] shadow-hard-sm">
              <div className="font-display font-black text-3xl text-purple-deep">
                {submittedCount}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-ink font-bold mt-1">
                Submitted
              </div>
            </div>

            <div className="bg-white border-2 border-ink rounded-xl p-4 min-w-[110px] shadow-hard-sm">
              <div className="font-display font-black text-3xl text-purple-deep">
                {answeredCount}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-ink font-bold mt-1">
                Answered live
              </div>
            </div>

            <div className="bg-white border-2 border-ink rounded-xl p-4 min-w-[110px] shadow-hard-sm">
              <div className="font-display font-black text-3xl text-purple-deep">
                {remainingCount}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-ink font-bold mt-1">
                Going to follow-up
              </div>
            </div>
          </div>

          <p className="font-body font-semibold text-muted-ink text-base mb-6">
            Thanks for helping shape the conversation.
          </p>

          <Button variant="ghost" onClick={restartDemo}>
            Return to landing
          </Button>
        </StageFrame>
      </div>
    </div>
  );
}
