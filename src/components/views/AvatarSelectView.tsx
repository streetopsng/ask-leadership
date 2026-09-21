import { useSession } from '../../context/SessionContext';
import { AVATARS } from '../../constants/avatars';
import Button from '../common/Button';
import { MicIcon } from '../../constants/icons';

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

export default function AvatarSelectView() {
  const { me, chooseAvatar, confirmEnterRoom, setView } = useSession();
  const chosen = me.avatar;

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 border-b-[2.5px] border-ink bg-white">
        <button
          type="button"
          onClick={() => setView('employeeWelcome')}
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider font-bold text-ink hover:text-purple-deep cursor-pointer"
        >
          ← Back
        </button>
        <div className="font-mono text-xs uppercase tracking-wider font-bold text-purple-deep">
          Ask Leadership
        </div>
        <div className="w-14" />
      </header>

      {/* Body */}
      <main className="flex-1 px-6 py-10 max-w-xl mx-auto w-full">
        <div className="text-center mb-8 animate-rise">
          <h2 className="font-display font-black text-3xl sm:text-4xl text-ink uppercase tracking-tight">
            Choose your avatar
          </h2>
          <p className="font-body font-semibold text-muted-ink text-base mt-2 max-w-md mx-auto">
            This is your identity for this session. No names. No profiles. Just your voice.
          </p>
        </div>

        {/* Avatars Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4 max-w-sm sm:max-w-lg mx-auto">
          {AVATARS.map((a) => {
            const isSelected = chosen === a.id;
            const bgClass = AVATAR_BG_CLASSES[a.id] || 'bg-[#EDE4F5]';
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => chooseAvatar(a.id)}
                className={`relative aspect-square rounded-full border-[2.5px] border-ink flex items-center justify-center text-2xl sm:text-3xl cursor-pointer transition-all duration-150 ${bgClass} ${
                  isSelected
                    ? 'shadow-hard-purple-lg -translate-x-1 -translate-y-1'
                    : 'shadow-hard-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-md'
                }`}
                aria-label={`Choose ${a.name} avatar`}
                aria-pressed={isSelected}
              >
                <span>{a.emoji}</span>
                {isSelected && (
                  <span className="absolute -top-1.5 -right-1.5 bg-sage text-ink w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border-2 border-ink shadow-hard-sm">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Safety Note */}
        <div className="flex items-center justify-center gap-2 mt-8 text-sage-deep font-mono text-xs uppercase tracking-wider font-bold">
          <MicIcon className="w-4 h-4" />
          <span>Anonymous by design</span>
        </div>

        {/* Confirm Button */}
        {chosen && (
          <div className="text-center mt-8 animate-rise">
            <p className="font-mono text-xs uppercase tracking-wider font-bold text-purple-deep mb-2">
              You're in.
            </p>
            <Button
              variant="primary"
              onClick={confirmEnterRoom}
            >
              Enter the room
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
