import { useSession } from './SessionContext';

/**
 * Returns session mutation actions.
 */
export function useSessionActions() {
  const {
    createSession,
    joinSession,
    chooseAvatar,
    confirmEnterRoom,
    submitQuestion,
    openSubmissions,
    closeSubmissions,
    removeQuestion,
    startVoting,
    voteQuestion,
    closeVotingPickWinner,
    moveToAnswering,
    markAnswered,
    nextQuestion,
    endSession,
    restartDemo,
    switchRole,
    updateConfig,
    setSessionMode,
    showToast,
    setView,
    setDemoRole,
    setClosingStep,
  } = useSession();

  return {
    createSession,
    joinSession,
    chooseAvatar,
    confirmEnterRoom,
    submitQuestion,
    openSubmissions,
    closeSubmissions,
    removeQuestion,
    startVoting,
    voteQuestion,
    closeVotingPickWinner,
    moveToAnswering,
    markAnswered,
    nextQuestion,
    endSession,
    restartDemo,
    switchRole,
    updateConfig,
    setSessionMode,
    showToast,
    setView,
    setDemoRole,
    setClosingStep,
  };
}
