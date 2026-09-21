import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionProvider, useSession } from '../../../context/SessionContext';
import HostControlView from '../HostControlView';

const { subscribeSession, subscribeQuestions, deleteQuestion } = vi.hoisted(() => ({
  subscribeSession: vi.fn(),
  subscribeQuestions: vi.fn(),
  deleteQuestion: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../firebase/config', () => ({
  isFirebaseConfigured: () => true,
  isDemoMode: () => false,
  signInAnonymouslyToFirebase: vi.fn().mockResolvedValue('host-1'),
}));

vi.mock('../../../firebase/sessionService', () => ({
  createFirestoreSession: vi.fn().mockResolvedValue('AL-TEST'),
  getFirestoreSession: vi.fn().mockResolvedValue({
    id: 'AL-TEST',
    hostUid: 'host-1',
    phase: 'setup',
    round: 1,
    currentQuestionId: null,
    config: { participants: 1, leaders: '', duration: 1, date: '', time: '', meetingLink: '', location: '' },
  }),
  subscribeToFirestoreSession: (...args: unknown[]) => subscribeSession(...args),
  subscribeToFirestoreQuestions: (...args: unknown[]) => subscribeQuestions(...args),
  subscribeToMyVote: vi.fn().mockReturnValue(() => {}),
  submitFirestoreQuestion: vi.fn().mockResolvedValue(true),
  voteFirestoreQuestion: vi.fn().mockResolvedValue(true),
  markFirestoreQuestionAnswered: vi.fn().mockResolvedValue(true),
  updateFirestoreSessionPhase: vi.fn().mockResolvedValue(true),
  resetQuestionVotes: vi.fn().mockResolvedValue(true),
  deleteFirestoreQuestion: deleteQuestion,
}));

vi.mock('../../../firebase/presence', () => ({
  goOnline: vi.fn(),
  goOffline: vi.fn(),
  subscribeToPresence: vi.fn().mockReturnValue(() => {}),
}));

function JoinDriver() {
  const { joinSession } = useSession();
  useEffect(() => {
    void joinSession('AL-TEST');
  }, [joinSession]);
  return null;
}

async function renderAndFeed() {
  subscribeSession.mockImplementation(() => () => {});
  subscribeQuestions.mockImplementation(() => () => {});
  render(
    <SessionProvider>
      <JoinDriver />
      <HostControlView />
    </SessionProvider>
  );
  await waitFor(() => expect(subscribeSession).toHaveBeenCalled());
  const onSession = subscribeSession.mock.calls[0][1] as (patch: {
    phase: string; round: number; currentQuestionId: string | null;
  }) => void;
  const onQuestions = subscribeQuestions.mock.calls[0][1] as (
    questions: Array<{ id: string; text: string; votes: number; answered: boolean }>
  ) => void;
  act(() => {
    onSession({ phase: 'submitting', round: 1, currentQuestionId: null });
    onQuestions([{ id: 'q1', text: 'Spam question', votes: 0, answered: false }]);
  });
}

describe('HostControlView question moderation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an inline confirm before deleting and does not delete on the first click', async () => {
    await renderAndFeed();

    fireEvent.click(screen.getByRole('button', { name: 'Remove question' }));

    expect(screen.getByRole('button', { name: 'Remove' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Keep' })).toBeTruthy();
    expect(screen.getByText('Spam question')).toBeTruthy();
    expect(deleteQuestion).not.toHaveBeenCalled();
  });

  it('cancels the removal when Keep is chosen', async () => {
    await renderAndFeed();

    fireEvent.click(screen.getByRole('button', { name: 'Remove question' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep' }));

    expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull();
    expect(screen.getByText('Spam question')).toBeTruthy();
    expect(deleteQuestion).not.toHaveBeenCalled();
  });

  it('deletes the question in Firestore and drops it from the pool when confirmed', async () => {
    await renderAndFeed();

    fireEvent.click(screen.getByRole('button', { name: 'Remove question' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(deleteQuestion).toHaveBeenCalledWith('AL-TEST', 'q1'));
    expect(screen.queryByText('Spam question')).toBeNull();
  });
});