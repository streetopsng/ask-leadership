import { useEffect } from 'react';
import { SessionProvider, useSession } from './context/SessionContext';
import { isFirebaseConfigured, missingFirebaseEnvVars } from './firebase/config';
import HostControlView from './components/views/HostControlView';
import EmployeeWelcomeView from './components/views/EmployeeWelcomeView';
import AvatarSelectView from './components/views/AvatarSelectView';
import RoomView from './components/views/RoomView';
import ClosingView from './components/views/ClosingView';
import HostDashboardView from './components/views/HostDashboardView';
import ToastStack from './components/common/ToastStack';
import ErrorBoundary from './components/common/ErrorBoundary';
import InitializationFallback from './components/common/InitializationFallback';
import SessionExpiredModal from './components/common/SessionExpiredModal';
import LoadingScreen from './components/common/LoadingScreen';
import { returnToGummyGum } from './lib/gummygumSession';
import type { ViewName } from './types';

const HOST_VIEWS: ViewName[] = ['hostControl', 'dashboard', 'closing'];
const PARTICIPANT_VIEWS: ViewName[] = ['employeeWelcome', 'avatarSelect', 'room', 'closing'];

function GummyGumLockedScreen() {
  return (
    <div className="min-h-screen w-full bg-cream text-ink flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center space-y-4 bg-white border-[2.5px] border-ink rounded-3xl shadow-hard-lg p-8">
        <h1 className="font-display font-bold text-xl text-ink">This experience is only available through GummyGum</h1>
        <p className="text-muted-ink text-sm font-semibold">Open it from the GummyGum hub to run a session.</p>
        <a
          href="https://gummygum.app"
          className="inline-flex items-center justify-center gap-2 rounded-full border-[2.5px] border-ink font-bold font-body bg-gold text-ink px-7 py-3.5 shadow-hard-md"
        >
          Go to GummyGum
        </a>
      </div>
    </div>
  );
}

// A GummyGum launch without Firebase would silently run local-only, so the host would never see anyone join.
function NotSetUpScreen() {
  useEffect(() => {
    console.error(`Ask Leadership: Firebase is not configured. Missing env vars: ${missingFirebaseEnvVars().join(', ') || 'none'}`);
  }, []);

  return (
    <div className="min-h-screen w-full bg-cream text-ink flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center space-y-4 bg-white border-[2.5px] border-ink rounded-3xl p-8">
        <h1 className="font-display font-bold text-xl text-ink">This experience isn't fully set up yet</h1>
        <p className="text-muted-ink text-sm font-semibold">
          Live sync is not configured for Ask Leadership, so it can't run a session right now. Please let your GummyGum admin know.
        </p>
        <a
          href="https://gummygum.app"
          className="inline-flex items-center justify-center gap-2 rounded-full border-[2.5px] border-ink font-bold font-body bg-gold text-ink px-7 py-3.5"
        >
          Back to GummyGum
        </a>
      </div>
    </div>
  );
}

function MainApp() {
  const {
    ggAccessState,
    ggSession,
    sessionEnded,
    authStatus,
    syncStatus,
    retryAuthentication,
    retryJoin,
    retrySync,
  } = useSession();

  if (ggAccessState === 'checking') {
    return <LoadingScreen />;
  }

  if (ggAccessState === 'denied') {
    return <GummyGumLockedScreen />;
  }

  if (ggSession && !isFirebaseConfigured()) {
    return <NotSetUpScreen />;
  }

  if (sessionEnded) {
    return (
      <div className="min-h-screen w-full bg-cream">
        <SessionExpiredModal
          isHost={!!ggSession?.isHost}
          context={sessionEnded}
          hubUrl={ggSession?.hubUrl ?? null}
        />
      </div>
    );
  }

  if (authStatus === 'signingIn') {
    return <InitializationFallback state="signingIn" onRetry={retryAuthentication} />;
  }

  if (authStatus === 'error') {
    return <InitializationFallback state="authError" onRetry={retryAuthentication} />;
  }

  if (syncStatus === 'syncing') {
    return <InitializationFallback state="joining" onRetry={retryJoin} />;
  }

  if (syncStatus === 'error') {
    return <InitializationFallback state="joinError" onRetry={retryJoin} />;
  }

  return (
    <div className="min-h-screen bg-cream text-ink font-body selection:bg-brand-purple selection:text-ink">
      <ErrorBoundary onReset={() => returnToGummyGum(ggSession?.hubUrl)} onRetry={retrySync}>
        <SessionViews />
      </ErrorBoundary>
    </div>
  );
}

function SessionViews() {
  const { view, syncError, sessionExpired, session, uid, ggSession } = useSession();

  if (syncError) throw syncError;

  // Ask Leadership only runs from a GummyGum launch, which sets the role; anything else waits here while it routes.
  if (!ggSession || !(ggSession.isHost ? HOST_VIEWS : PARTICIPANT_VIEWS).includes(view)) {
    return <LoadingScreen />;
  }

  const renderView = () => {
    switch (view) {
      case 'hostControl':
        return <HostControlView />;
      case 'dashboard':
        return <HostDashboardView />;
      case 'employeeWelcome':
        return <EmployeeWelcomeView />;
      case 'avatarSelect':
        return <AvatarSelectView />;
      case 'room':
        return <RoomView />;
      case 'closing':
        return <ClosingView />;
      default:
        return <LoadingScreen />;
    }
  };

  return (
    <>
      {renderView()}
      {sessionExpired && (
        <SessionExpiredModal
          isHost={!!session?.hostUid && session.hostUid === uid}
          context={sessionExpired}
          hubUrl={ggSession?.hubUrl ?? null}
        />
      )}
      <ToastStack />
    </>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <MainApp />
    </SessionProvider>
  );
}
