import { useSession } from './SessionContext';

/**
 * Returns session state and derived values.
 */
export function useSessionState() {
  const {
    session,
    me,
    view,
    demoRole,
    closingStep,
    toasts,
    presenceCount,
    activePool,
    submittedCount,
    answeredCount,
    remainingCount,
    currentQuestion,
  } = useSession();

  return {
    session,
    me,
    view,
    demoRole,
    closingStep,
    toasts,
    presenceCount,
    activePool,
    submittedCount,
    answeredCount,
    remainingCount,
    currentQuestion,
  };
}
