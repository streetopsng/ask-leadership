import { useSession } from '../../context/SessionContext';

export default function ToastStack() {
  const { toasts } = useSession();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2.5 pointer-events-none w-full px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-ink text-cream font-mono text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-full border-2 border-ink shadow-hard-md animate-toast"
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
