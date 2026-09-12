import React from 'react';
import { useSession } from '../../context/SessionContext';
import Button from '../common/Button';
import Waveform from '../common/Waveform';

export default function EmployeeWelcomeView() {
  const { setView } = useSession();

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 border-b-[2.5px] border-ink bg-white">
        <button
          type="button"
          onClick={() => setView('landing')}
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
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-lg mx-auto animate-rise">
          <div className="flex justify-center mb-5">
            <Waveform count={6} variant="voice" />
          </div>

          <h1 className="font-display font-black text-4xl sm:text-5xl text-ink uppercase tracking-tight">
            Ask Leadership
          </h1>

          <p className="font-body font-semibold text-muted-ink text-lg mt-4 mb-8 leading-relaxed">
            Ask anonymously. See what others are asking. Help decide what leadership answers.
          </p>

          <Button
            variant="primary"
            onClick={() => setView('avatarSelect')}
          >
            Enter the room
          </Button>
        </div>
      </main>
    </div>
  );
}
