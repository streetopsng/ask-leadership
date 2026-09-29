import { useEffect } from 'react';
import { SessionProvider, useSession } from './context/SessionContext';
import { isFirebaseConfigured, missingFirebaseEnvVars } from './firebase/config';
import LandingView from './components/views/LandingView';
import HostSetupView from './components/views/HostSetupView';
import HostReadyView from './components/views/HostReadyView';
import HostControlView from './components/views/HostControlView';
import EmployeeInviteView from './components/views/EmployeeInviteView';
import EmployeeWelcomeView from './components/views/EmployeeWelcomeView';
import AvatarSelectView from './components/views/AvatarSelectView';
import RoomView from './components/views/RoomView';
import ClosingView from './components/views/ClosingView';
import HostDashboardView from './components/views/HostDashboardView';
import ToastStack from './components/common/ToastStack';
import RoleSwitcher from './components/common/RoleSwitcher';
import ErrorBoundary from './components/common/ErrorBoundary';
import InitializationFallback from './components/common/InitializationFallback';
import SessionExpiredModal from './components/common/SessionExpiredModal';
import type { ViewName } from './types';

const HOST_VIEWS: ViewName[] = ['hostSetup', 'hostReady', 'hostControl', 'dashboard', 'closing'];
const PARTICIPANT_VIEWS: ViewName[] = ['employeeInvite', 'employeeWelcome', 'avatarSelect', 'room', 'closing'];

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
    restartDemo,
    retryAuthentication,
    retryJoin,
    retrySync,
  } = useSession();

  if (ggAccessState === 'checking') {
    return <div className="min-h-screen w-full bg-cream" />;
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
      <ErrorBoundary onReset={restartDemo} onRetry={retrySync}>
        <SessionViews />
      </ErrorBoundary>
    </div>
  );
}

function SessionViews() {
  const { view, syncError, sessionExpired, session, uid, ggSession, retryJoin } = useSession();

  if (syncError) throw syncError;

  // GummyGum sets the role; never render the other role's screens (or the standalone landing) while routing.
  if (ggSession && !(ggSession.isHost ? HOST_VIEWS : PARTICIPANT_VIEWS).includes(view)) {
    return <InitializationFallback state="joining" onRetry={retryJoin} />;
  }

  const renderView = () => {
    switch (view) {
      case 'landing':
        return <LandingView />;
      case 'hostSetup':
        return <HostSetupView />;
      case 'hostReady':
        return <HostReadyView />;
      case 'hostControl':
        return <HostControlView />;
      case 'dashboard':
        return <HostDashboardView />;
      case 'employeeInvite':
        return <EmployeeInviteView />;
      case 'employeeWelcome':
        return <EmployeeWelcomeView />;
      case 'avatarSelect':
        return <AvatarSelectView />;
      case 'room':
        return <RoomView />;
      case 'closing':
        return <ClosingView />;
      default:
        return <LandingView />;
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
      <RoleSwitcher />
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
