import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionProvider, useSession } from '../../../context/SessionContext';
import ClosingView from '../ClosingView';
import ToastStack from '../../common/ToastStack';

const { subscribeSession, subscribeQuestions } = vi.hoisted(() => ({
  subscribeSession: vi.fn(),
  subscribeQuestions: vi.fn(),
}));

vi.mock('../../../firebase/config', () => ({
  isFirebaseConfigured: () => true,
  isDemoMode: () => false,
  signInAnonymouslyToFirebase: vi.fn().mockResolvedValue('host-1'),
}));

vi.mock('../../../firebase/sessionService', () => ({
  getFirestoreSession: vi.fn().mockResolvedValue({
    id: 'AL-TEST',
    hostUid: 'host-1',
    phase: 'ended',
    round: 1,
    currentQuestionId: null,
    config: { participants: 1, leaders: '', duration: 1, date: '', time: '', meetingLink: '', location: '' },
  }),
  subscribeToFirestoreSession: (...args: unknown[]) => subscribeSession(...args),
  subscribeToFirestoreQuestions: (...args: unknown[]) => subscribeQuestions(...args),
  subscribeToMyVote: vi.fn().mockReturnValue(() => {}),
  updateFirestoreSessionPhase: vi.fn().mockResolvedValue(true),
  resetQuestionVotes: vi.fn().mockResolvedValue(true),
  markFirestoreQuestionAnswered: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../firebase/presence', () => ({
  goOnline: vi.fn(),
  goOffline: vi.fn(),
  subscribeToPresence: vi.fn().mockReturnValue(() => {}),
}));

function Driver() {
  const { joinSession, setClosingStep } = useSession();
  useEffect(() => {
    void joinSession('AL-TEST');
  }, [joinSession]);
  useEffect(() => {
    setClosingStep(1);
  }, [setClosingStep]);
  return null;
}

async function renderClosing(hostUid: string) {
  subscribeSession.mockImplementation(() => () => {});
  subscribeQuestions.mockImplementation(() => () => {});
  render(
    <SessionProvider>
      <Driver />
      <ClosingView />
      <ToastStack />
    </SessionProvider>
  );
  await waitFor(() => expect(subscribeSession).toHaveBeenCalled());

  const onSession = subscribeSession.mock.calls[0][1] as (patch: {
    phase: string; round: number; currentQuestionId: string | null; hostUid: string;
  }) => void;
  const onQuestions = subscribeQuestions.mock.calls[0][1] as (
    questions: Array<{ id: string; text: string; votes: number; answered: boolean; avatarId: string }>
  ) => void;

  act(() => {
    onSession({ phase: 'ended', round: 1, currentQuestionId: null, hostUid });
    onQuestions([
      { id: 'q1', text: 'Most wanted', votes: 5, answered: false, avatarId: 'panda' },
      { id: 'q2', text: 'Was answered', votes: 9, answered: true, avatarId: 'fox' },
    ]);
  });
}

describe('ClosingView export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows host-only export controls to the host', async () => {
    await renderClosing('host-1');
    expect(screen.getByRole('button', { name: 'Download session CSV' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copy follow-up list' })).toBeTruthy();
  });

  it('hides export controls for non-hosts', async () => {
    await renderClosing('host-2');
    expect(screen.queryByRole('button', { name: 'Download session CSV' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Copy follow-up list' })).toBeNull();
  });

  it('copies the follow-up list to the clipboard and toasts', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await renderClosing('host-1');

    fireEvent.click(screen.getByRole('button', { name: 'Copy follow-up list' }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).toContain('Submitted: 2');
    expect(copied).toContain('Answered live: 1');
    expect(copied).toContain('Going to follow-up: 1');
    expect(copied).toContain('Most wanted (5 votes)');
    expect(await screen.findByText('Follow-up list copied.')).toBeTruthy();
  });

  it('downloads a CSV file with the session code as filename', async () => {
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    await renderClosing('host-1');

    fireEvent.click(screen.getByRole('button', { name: 'Download session CSV' }));

    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toContain('text/csv');
    const link = clickSpy.mock.instances?.[0] as HTMLAnchorElement | undefined;
    expect(link?.download).toBe('ask-leadership-AL-TEST.csv');

    const text = await blob.text();
    expect(text).toContain('text,votes,answered,round answered,avatar id,submission time');
    expect(text).toContain('Most wanted,5,no,,panda,');
    expect(text).toContain('Was answered,9,yes,,fox,');
  });
});