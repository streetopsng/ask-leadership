import Button from './Button';
import { reportGummyGumCancel, returnToGummyGum } from '../../lib/gummygumSession';

interface SessionExpiredModalProps {
  isHost: boolean;
  context: 'lobby' | 'game' | 'ended';
  hubUrl: string | null;
}

export default function SessionExpiredModal({ isHost, context, hubUrl }: SessionExpiredModalProps) {
  const isEnded = context === 'ended';
  const message = isEnded
    ? isHost
      ? 'This session has ended. Returning you to GummyGum...'
      : 'The host ended this session. You can close this tab now.'
    : context === 'game'
      ? isHost
        ? 'This session was abandoned mid-session with nobody connected for several hours, so it has been ended. You can return to GummyGum to launch a fresh session.'
        : 'This session was ended after being abandoned for several hours. Thank you for being here. You can safely close this tab now.'
      : isHost
        ? 'This session was inactive in the lobby for more than 20 minutes and has expired. You can return to GummyGum to launch a fresh session.'
        : 'This session has expired due to inactivity. Thank you for being here. You can safely close this tab now.';

  const handleHostRehost = async () => {
    await reportGummyGumCancel();
    window.location.href = hubUrl || 'https://gummygum.app';
  };

  const handleClose = () => {
    try {
      window.close();
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-5 bg-black/60 backdrop-blur-xs">
      <div className="bg-white border-[2.5px] border-ink rounded-2xl p-6 max-w-sm w-full text-center shadow-hard-lg flex flex-col items-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9 text-purple-deep mb-3" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <h3 className="font-display font-bold text-lg text-ink mb-2">{isEnded ? 'Session Ended' : 'Session Expired'}</h3>
        <p className="font-body font-semibold text-xs text-muted-ink mb-6 leading-relaxed">{message}</p>
        {isHost && isEnded ? (
          <Button variant="dark" fullWidth onClick={() => returnToGummyGum(hubUrl ?? undefined)}>
            Back to GummyGum
          </Button>
        ) : isHost ? (
          <Button variant="dark" fullWidth onClick={handleHostRehost}>
            Return to GummyGum to Rehost
          </Button>
        ) : (
          <Button variant="ghost" fullWidth onClick={handleClose}>
            Close Tab
          </Button>
        )}
      </div>
    </div>
  );
}
