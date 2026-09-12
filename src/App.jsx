import React from 'react';
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
import ToastStack from './components/common/ToastStack';

function MainApp() {
  const { view } = useSession();

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
    <div className="min-h-screen bg-cream text-ink font-body selection:bg-brand-purple selection:text-ink">
      {renderView()}
      <ToastStack />
    </div>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <MainApp />
    </SessionProvider>
  );
}
