import { useSession } from '../../context/SessionContext';

export default function ToastStack() {
  const { toasts } = useSession();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2.5 pointer-events-none w-full px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-ink text-cream font-mono text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-full border-2 border-ink shadow-hard-md animate-toast flex items-center gap-3 pointer-events-auto"
        >
          <span>{t.text}</span>
          {t.action && (
            <button
              type="button"
              onClick={t.action.onClick}
              className="underline underline-offset-2 hover:text-brand-purple cursor-pointer"
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
