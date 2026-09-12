import React from 'react';
import { useSession } from '../../context/SessionContext';
import Button from '../common/Button';
import Waveform from '../common/Waveform';
import { QrIcon } from '../../constants/icons';

export default function EmployeeInviteView() {
  const { session, setView, showToast } = useSession();
  const { mode, config } = session;

  const handleSimulateMeeting = () => {
    showToast('This would open your video meeting');
  };

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
          Invitation
        </div>
        <div className="w-14" />
      </header>

      {/* Body */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white border-[2.5px] border-ink rounded-3xl shadow-hard-lg p-8 sm:p-10 max-w-md w-full text-center animate-rise">
          <div className="flex justify-center mb-4">
            <Waveform count={6} variant="voice" />
          </div>

          <div className="font-mono text-xs uppercase tracking-wider font-bold text-purple-deep mb-2">
            You're invited · Room {session.id}
          </div>

          <h2 className="font-display font-bold text-3xl text-ink leading-snug mb-3">
            Ask Leadership is starting soon.
          </h2>

          <p className="font-body font-semibold text-muted-ink text-base leading-relaxed mb-8">
            {mode === 'virtual'
              ? 'Join the room, then hop into the call when it starts.'
              : `Join the room from your phone — the conversation happens live in ${config.location || 'the room'}.`}
          </p>

          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              fullWidth
              onClick={() => setView('employeeWelcome')}
            >
              Join Ask Leadership
            </Button>

            {mode === 'virtual' ? (
              <Button
                variant="ghost"
                fullWidth
                onClick={handleSimulateMeeting}
              >
                Join meeting
              </Button>
            ) : (
              <div className="pt-2">
                <div className="w-32 h-32 mx-auto bg-white border-2 border-ink rounded-2xl p-2.5 shadow-hard-sm mb-2">
                  <QrIcon className="w-full h-full" />
                </div>
                <div className="font-mono text-[11px] uppercase tracking-wider font-bold text-muted-ink">
                  Scan to join in {config.location || 'the room'}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
