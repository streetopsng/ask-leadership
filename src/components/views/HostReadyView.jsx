import React, { useState } from 'react';
import { useSession } from '../../context/SessionContext';
import Button from '../common/Button';
import { MicIcon, QrIcon } from '../../constants/icons';

export default function HostReadyView() {
  const { session, setView, showToast } = useSession();
  const { config, mode } = session;
  const [showQr, setShowQr] = useState(false);

  const joinUrl = `${window.location.origin}/?join=${session.id}`;

  const handleCopyJoin = () => {
    navigator.clipboard?.writeText(joinUrl);
    showToast('Join link copied');
  };

  const handleCopyMeeting = () => {
    navigator.clipboard?.writeText(config.meetingLink);
    showToast('Meeting link copied');
  };

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 border-b-[2.5px] border-ink bg-white">
        <button
          type="button"
          onClick={() => setView('hostSetup')}
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider font-bold text-ink hover:text-purple-deep cursor-pointer"
        >
          ← Edit
        </button>
        <div className="font-mono text-xs uppercase tracking-wider font-bold text-purple-deep">
          Host · Session ready
        </div>
        <div className="w-14" />
      </header>

      {/* Body */}
      <main className="flex-1 px-6 py-10 max-w-xl mx-auto w-full">
        <div className="text-center mb-8 animate-rise">
          <div className="inline-flex items-center gap-2 mb-3 bg-sage-tint text-sage-deep border-2 border-ink px-4 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider font-bold">
            <MicIcon className="w-3.5 h-3.5" />
            <span>{mode === 'virtual' ? 'Virtual' : 'Physical'} session · {session.id}</span>
          </div>

          <h2 className="font-display font-bold text-3xl sm:text-4xl text-ink leading-tight">
            Your Ask Leadership session is ready.
          </h2>
          <p className="font-body font-semibold text-muted-ink text-base mt-2">
            {config.participants} invitations queued for{' '}
            {mode === 'virtual' ? 'the video call' : config.location || 'the room'}.
          </p>
        </div>

        <div className="bg-white border-[2.5px] border-ink rounded-3xl shadow-hard-lg p-6 sm:p-8 animate-rise space-y-4">
          {/* Join Link Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-cream border-2 border-ink rounded-xl p-3.5 sm:p-4">
            <div className="min-w-0">
              <span className="block font-mono text-[10px] uppercase text-muted-ink font-bold">Session Join Link</span>
              <span className="font-mono text-xs sm:text-sm text-purple-deep font-bold truncate block">
                {joinUrl}
              </span>
            </div>
            <Button variant="dark" size="sm" onClick={handleCopyJoin} className="shrink-0 w-full sm:w-auto">
              Copy join link
            </Button>
          </div>

          {/* Meeting Link Row */}
          {mode === 'virtual' && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-cream border-2 border-ink rounded-xl p-3.5 sm:p-4">
              <span className="font-mono text-xs sm:text-sm text-muted-ink font-bold truncate">
                {config.meetingLink}
              </span>
              <Button variant="dark" size="sm" onClick={handleCopyMeeting} className="shrink-0 w-full sm:w-auto">
                Copy meeting link
              </Button>
            </div>
          )}

          {/* QR toggle */}
          <Button
            variant="ghost"
            fullWidth
            onClick={() => setShowQr(!showQr)}
            className="mt-2"
          >
            {showQr ? 'Hide QR code' : 'Show QR code'}
          </Button>

          {showQr && (
            <div className="w-36 h-36 mx-auto bg-white border-[2.5px] border-ink rounded-2xl p-3 shadow-hard-md animate-rise">
              <QrIcon className="w-full h-full" />
            </div>
          )}

          <div className="h-0.5 bg-line my-4" />

          {/* Enter Control Room */}
          <Button
            variant="gold"
            fullWidth
            onClick={() => setView('hostControl')}
          >
            Enter host control room →
          </Button>
        </div>
      </main>
    </div>
  );
}
