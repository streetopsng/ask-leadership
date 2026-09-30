import { useState } from 'react';
import { useSession } from '../../context/SessionContext';
import { AVATAR_IDS, avatarUrl } from '../../lib/avatars';
import Button from '../common/Button';
import GameRulesModal from '../common/GameRulesModal';
import { MicIcon } from '../../constants/icons';

export default function AvatarSelectView() {
  const { me, chooseAvatar, confirmEnterRoom, setView, ggSession } = useSession();
  const chosen = me.avatar;
  const [showRules, setShowRules] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <header className="flex items-center justify-between px-6 py-5 border-b-[2.5px] border-ink bg-white">
        {ggSession ? (
          <div className="w-14" />
        ) : (
          <button
            type="button"
            onClick={() => setView('employeeWelcome')}
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider font-bold text-ink hover:text-purple-deep cursor-pointer"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}
        <div className="font-mono text-xs uppercase tracking-wider font-bold text-purple-deep">
          Ask Leadership
        </div>
        <div className="w-14" />
      </header>

      <main className="flex-1 px-6 py-10 max-w-xl mx-auto w-full">
        <div className="text-center mb-8 animate-rise">
          <h2 className="font-display font-black text-3xl sm:text-4xl text-ink uppercase tracking-tight">
            Choose your avatar
          </h2>
          <p className="font-body font-semibold text-muted-ink text-base mt-2 max-w-md mx-auto">
            This is your identity for this session. No names. No profiles. Just your voice.
          </p>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 sm:gap-4 max-w-sm sm:max-w-lg mx-auto">
          {AVATAR_IDS.map((id, idx) => {
            const isSelected = chosen === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => chooseAvatar(id)}
                className={`relative aspect-square rounded-full border-[2.5px] cursor-pointer transition-colors duration-150 bg-white ${
                  isSelected ? 'border-purple-deep ring-2 ring-brand-purple' : 'border-line hover:border-ink'
                }`}
                aria-label={`Choose avatar ${idx + 1}`}
                aria-pressed={isSelected}
              >
                <img src={avatarUrl(id)} alt="" draggable={false} className="w-full h-full rounded-full object-cover" />
                {isSelected && (
                  <span className="absolute -top-1 -right-1 bg-sage text-white w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-2 mt-8 text-sage-deep font-mono text-xs uppercase tracking-wider font-bold">
          <MicIcon className="w-4 h-4" />
          <span>Anonymous by design</span>
        </div>
      </main>

      <footer className="sticky bottom-0 border-t-[2.5px] border-ink bg-white px-6 py-4">
        <div className="max-w-xl mx-auto">
          <Button variant="primary" fullWidth disabled={!chosen} onClick={() => setShowRules(true)}>
            {chosen ? 'Enter the room' : 'Pick an avatar to continue'}
          </Button>
        </div>
      </footer>

      {showRules && (
        <GameRulesModal
          onConfirm={() => {
            setShowRules(false);
            confirmEnterRoom();
          }}
        />
      )}
    </div>
  );
}
