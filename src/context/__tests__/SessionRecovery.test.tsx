import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SessionProvider, useSession } from '../SessionContext';

const { subscribeSession, signInAnonymously } = vi.hoisted(() => ({
  subscribeSession: vi.fn(),
  signInAnonymously: vi.fn().mockResolvedValue('user-1'),
}));

vi.mock('../../firebase/config', () => ({
  isFirebaseConfigured: () => true,
  isDemoMode: () => false,
  signInAnonymouslyToFirebase: signInAnonymously,
}));

vi.mock('../../firebase/sessionService', () => ({
  getFirestoreSession: vi.fn().mockResolvedValue({
    id: 'AL-TEST',
    hostUid: 'host-1',
    phase: 'setup',
    round: 1,
    currentQuestionId: null,
    config: { participants: 1, leaders: '', duration: 1, date: '', time: '', meetingLink: '', location: '' },
  }),
  subscribeToFirestoreSession: (...args: unknown[]) => subscribeSession(...args),
  subscribeToFirestoreQuestions: vi.fn().mockReturnValue(() => {}),
  subscribeToMyVote: vi.fn().mockReturnValue(() => {}),
}));

vi.mock('../../firebase/presence', () => ({
  goOnline: vi.fn(),
  goOffline: vi.fn(),
  subscribeToPresence: vi.fn().mockReturnValue(() => {}),
}));

function Probe() {
  const { joinSession, authStatus, authError, syncError, retrySync } = useSession();

  useEffect(() => {
    void joinSession('AL-TEST');
  }, [joinSession]);

  if (authStatus === 'signingIn') return <p>Initializing</p>;
  if (authError) return <p>Initialization failed</p>;
  if (syncError) return <button type="button" onClick={retrySync}>Retry sync</button>;
  return <p>Connected</p>;
}

describe('SessionProvider recovery', () => {
  it('exposes initialization failures for the splash error state', async () => {
    signInAnonymously.mockRejectedValueOnce(new Error('auth failed'));

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>
    );

    expect(await screen.findByText('Initialization failed')).toBeTruthy();
  });

  it('re-subscribes after a listener reports an error and retry is requested', async () => {
    signInAnonymously.mockResolvedValue('user-1');
    subscribeSession.mockImplementation(() => () => {});

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>
    );

    await waitFor(() => expect(subscribeSession).toHaveBeenCalledOnce());
    const onError = subscribeSession.mock.calls[0][2] as (error: Error) => void;
    onError(new Error('listener failed'));

    fireEvent.click(await screen.findByRole('button', { name: 'Retry sync' }));
    await waitFor(() => expect(subscribeSession).toHaveBeenCalledTimes(2));
  });
});
