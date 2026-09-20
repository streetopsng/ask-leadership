import { SessionProvider, useSession } from './context/SessionContext';
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

function MainApp() {
  const {
    authStatus,
    syncStatus,
    restartDemo,
    retryAuthentication,
    retryJoin,
    retrySync,
  } = useSession();

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
  const { view, syncError } = useSession();

  if (syncError) throw syncError;

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
