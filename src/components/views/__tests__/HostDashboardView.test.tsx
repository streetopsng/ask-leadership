import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionProvider, useSession } from '../../../context/SessionContext';
import HostDashboardView from '../HostDashboardView';

const {
  summariesFn,
  listQuestionsFn,
  subscribeSession,
  subscribeQuestions,
  mockIsConfigured,
  mockIsDemo,
} = vi.hoisted(() => ({
  summariesFn: vi.fn(),
  listQuestionsFn: vi.fn(),
  subscribeSession: vi.fn(),
  subscribeQuestions: vi.fn(),
  mockIsConfigured: vi.fn(),
  mockIsDemo: vi.fn(),
}));

vi.mock('../../../firebase/config', () => ({
  isFirebaseConfigured: (...args: unknown[]) => mockIsConfigured(...args),
  isDemoMode: (...args: unknown[]) => mockIsDemo(...args),
  signInAnonymouslyToFirebase: vi.fn().mockResolvedValue('host-1'),
}));

vi.mock('../../../firebase/sessionService', () => ({
  createFirestoreSession: vi.fn(),
  getFirestoreSession: vi.fn(),
  subscribeToFirestoreSession: (...args: unknown[]) => subscribeSession(...args),
  subscribeToFirestoreQuestions: (...args: unknown[]) => subscribeQuestions(...args),
  subscribeToMyVote: vi.fn().mockReturnValue(() => {}),
  submitFirestoreQuestion: vi.fn(),
  voteFirestoreQuestion: vi.fn(),
  markFirestoreQuestionAnswered: vi.fn(),
  updateFirestoreSessionPhase: vi.fn(),
  resetQuestionVotes: vi.fn(),
  deleteFirestoreQuestion: vi.fn(),
  listHostSessionSummaries: (...args: unknown[]) => summariesFn(...args),
  listFirestoreQuestions: (...args: unknown[]) => listQuestionsFn(...args),
}));

vi.mock('../../../firebase/presence', () => ({
  goOnline: vi.fn(),
  goOffline: vi.fn(),
  subscribeToPresence: vi.fn().mockReturnValue(() => {}),
}));

const baseConfig = { participants: 1, leaders: '', duration: 1, date: '', time: '', meetingLink: '', location: '' };

function ViewProbe() {
  const { view } = useSession();
  return <span data-testid="view">{view}</span>;
}

function renderDashboard() {
  render(
    <SessionProvider>
      <ViewProbe />
      <HostDashboardView />
    </SessionProvider>
  );
}

async function awaitListLoaded() {
  await waitFor(() => expect(summariesFn).toHaveBeenCalledWith('host-1'), { timeout: 5000 });
  await screen.findByText('AL-NEW', undefined, { timeout: 5000 });
}

describe('HostDashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);
    mockIsDemo.mockReturnValue(false);
    summariesFn.mockResolvedValue([
      {
        session: { id: 'AL-NEW', hostUid: 'host-1', phase: 'ended', round: 2, createdAt: { toMillis: () => 2000 }, config: baseConfig },
        submitted: 4,
        answered: 1,
        unanswered: 3,
      },
      {
        session: { id: 'AL-OLD', hostUid: 'host-1', phase: 'ended', round: 1, createdAt: { toMillis: () => 1000 }, config: baseConfig },
        submitted: 2,
        answered: 2,
        unanswered: 0,
      },
    ]);
  });

  it('lists my hosted sessions with totals and the browser caveat', async () => {
    renderDashboard();

    await awaitListLoaded();
    expect(screen.getByText('AL-OLD')).toBeTruthy();
    expect(screen.getByText(/from this browser/)).toBeTruthy();
    // Totals only — phase, round, counts (text split across nodes, so regex)
    expect(screen.getAllByText(/ended/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/round 2/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/4 submitted/).length).toBeGreaterThan(0);
  });

  it('shows a placeholder when createdAt is missing', async () => {
    summariesFn.mockResolvedValue([
      {
        session: { id: 'AL-NODATE', hostUid: 'host-1', phase: 'ended', round: 1, config: baseConfig },
        submitted: 1,
        answered: 0,
        unanswered: 1,
      },
    ]);
    renderDashboard();

    await waitFor(() => expect(summariesFn).toHaveBeenCalledWith('host-1'), { timeout: 5000 });
    expect(await screen.findByText('AL-NODATE', undefined, { timeout: 5000 })).toBeTruthy();
    expect(screen.getAllByText(/date unknown/).length).toBeGreaterThan(0);
  });

  it('never fetches question text for the list', async () => {
    renderDashboard();

    await waitFor(() => expect(summariesFn).toHaveBeenCalled());
    expect(listQuestionsFn).not.toHaveBeenCalled();
  });

  it('opens the read-only summary with export actions', async () => {
    listQuestionsFn.mockResolvedValue([
      { id: 'q1', text: 'Most wanted', votes: 5, answered: false, avatarId: 'panda' },
      { id: 'q2', text: 'Was answered', votes: 9, answered: true, answeredRound: 2, avatarId: 'fox' },
    ]);
    renderDashboard();
    await awaitListLoaded();

    fireEvent.click(await screen.findByRole('button', { name: 'Open summary for AL-NEW' }, { timeout: 5000 }));

    await waitFor(() => expect(listQuestionsFn).toHaveBeenCalledWith('AL-NEW'));
    expect(await screen.findByRole('button', { name: 'Download session CSV' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copy follow-up list' })).toBeTruthy();
  });

  it('downloads the session CSV from the summary', async () => {
    listQuestionsFn.mockResolvedValue([
      { id: 'q1', text: 'Most wanted', votes: 5, answered: false, avatarId: 'panda' },
    ]);
    const createObjectURL = vi.fn(() => 'blob:mock');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });
    renderDashboard();
    await awaitListLoaded();

    fireEvent.click(await screen.findByRole('button', { name: 'Open summary for AL-NEW' }, { timeout: 5000 }));
    fireEvent.click(await screen.findByRole('button', { name: 'Download session CSV' }, { timeout: 5000 }));

    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
    const link = clickSpy.mock.instances?.[0] as HTMLAnchorElement | undefined;
    expect(link?.download).toBe('ask-leadership-AL-NEW.csv');
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(await blob.text()).toContain('Most wanted,5,no,,panda,');
  });

  it('shows an empty state when there are no past sessions', async () => {
    summariesFn.mockResolvedValue([]);
    renderDashboard();

    expect(await screen.findByText(/No past sessions yet/)).toBeTruthy();
  });

  it('explains demo mode instead of querying', async () => {
    mockIsConfigured.mockReturnValue(false);
    mockIsDemo.mockReturnValue(true);
    renderDashboard();

    expect(await screen.findByText(/turn off demo mode/)).toBeTruthy();
    expect(summariesFn).not.toHaveBeenCalled();
  });

  it('returns to the live session', async () => {
    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Back to live session' }));
    expect(screen.getByTestId('view').textContent).toBe('hostControl');
  });
});