import React from 'react';
import { useSession } from '../../context/SessionContext';

export default function RoleSwitcher() {
  const { session, me, demoRole, view, switchRole } = useSession();

  // Show if session was created or employee joined/entered
  const shouldShow = session.created || me.joined || me.avatar || view !== 'landing';

  if (!shouldShow) return null;

  const currentRole = demoRole || (view.startsWith('host') ? 'host' : 'employee');

  return (
    <div className="fixed bottom-3.5 right-3.5 sm:bottom-5 sm:right-5 z-40 bg-white border-[2.5px] border-ink rounded-full p-1 flex gap-1 shadow-hard-md">
      <button
        type="button"
        onClick={() => switchRole('employee')}
        className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full font-mono text-[10px] sm:text-[11px] font-bold tracking-wider uppercase transition-colors cursor-pointer ${
          currentRole === 'employee'
            ? 'bg-brand-purple text-ink border-2 border-ink shadow-hard-sm'
            : 'text-muted-ink hover:text-ink'
        }`}
      >
        Employee
      </button>
      <button
        type="button"
        onClick={() => switchRole('host')}
        className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full font-mono text-[10px] sm:text-[11px] font-bold tracking-wider uppercase transition-colors cursor-pointer ${
          currentRole === 'host'
            ? 'bg-brand-purple text-ink border-2 border-ink shadow-hard-sm'
            : 'text-muted-ink hover:text-ink'
        }`}
      >
        Host
      </button>
    </div>
  );
}
