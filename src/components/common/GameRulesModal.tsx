import Button from './Button';
import { MicIcon } from '../../constants/icons';

const STEPS: [string, string][] = [
  ['Ask anonymously', 'Submit the question you have always wanted to ask leadership. Only your avatar shows, never your name.'],
  ['See what others are asking', 'Every question lands in a shared feed so you can see what the room is curious about.'],
  ['Vote on what matters', 'Each round you get one vote. The most-voted question is the next one leadership answers.'],
  ['Hear it answered live', 'Leaders answer the winning question, then the next voting round begins until the session wraps up.'],
];

export default function GameRulesModal({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-title"
    >
      <div className="bg-white border-[2.5px] border-ink rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-hard-lg flex flex-col max-h-[90vh] overflow-y-auto animate-rise">
        <div className="text-center mb-5">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-tint border-2 border-ink font-mono text-[11px] uppercase tracking-wider font-bold text-purple-deep mb-3">
            About this experience
          </div>
          <h3 id="rules-title" className="font-display font-black text-2xl sm:text-[26px] text-ink uppercase tracking-tight">
            How Ask Leadership works
          </h3>
          <p className="font-body font-semibold text-sm text-muted-ink mt-2 leading-relaxed">
            An anonymous Q&amp;A where the whole room decides which questions leadership answers.
          </p>
        </div>

        <ol className="space-y-3 mb-5">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="flex items-start gap-3 p-3.5 rounded-2xl bg-cream border-2 border-line">
              <span className="w-8 h-8 rounded-xl bg-brand-purple border-2 border-ink text-ink font-display font-black text-sm flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <div className="text-left">
                <div className="font-display font-bold text-[14px] text-ink">{title}</div>
                <div className="font-body font-semibold text-xs text-muted-ink mt-0.5 leading-snug">{body}</div>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-sage-tint border-2 border-sage mb-6 text-left">
          <MicIcon className="w-4 h-4 shrink-0 text-sage-deep" />
          <span className="font-body font-semibold text-xs text-sage-deep leading-snug">
            Anonymous by design: only your avatar appears next to your question.
          </span>
        </div>

        <Button variant="primary" fullWidth onClick={onConfirm}>
          Got it, enter the room
        </Button>
      </div>
    </div>
  );
}
