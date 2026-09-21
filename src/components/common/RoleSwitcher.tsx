import { useSession } from '../../context/SessionContext';

export default function RoleSwitcher() {
  const { session, me, demoRole, view, switchRole } = useSession();

  // Show if session exists or employee joined
  if (!session && !me.joined) return null;

  const currentRole = demoRole || (view.startsWith('host') ? 'host' : 'employee');

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50 bg-white border-[2.5px] border-ink rounded-full p-1.5 flex gap-1 shadow-hard-md">
      <button
        type="button"
        onClick={() => switchRole('employee')}
        className={`px-3.5 py-2 rounded-full font-mono text-[11px] font-bold tracking-wider uppercase transition-colors cursor-pointer ${
          currentRole === 'employee'
            ? 'bg-brand-purple text-ink'
            : 'text-muted-ink hover:text-ink'
        }`}
      >
        Employee
      </button>
      <button
        type="button"
        onClick={() => switchRole('host')}
        className={`px-3.5 py-2 rounded-full font-mono text-[11px] font-bold tracking-wider uppercase transition-colors cursor-pointer ${
          currentRole === 'host'
            ? 'bg-brand-purple text-ink'
            : 'text-muted-ink hover:text-ink'
        }`}
      >
        Host
      </button>
    </div>
  );
}
