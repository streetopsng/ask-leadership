import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionProvider, useSession } from '../SessionContext';
import type { Question, Session } from '../../types';

const { subscribeSession, subscribeQuestions, updatePhase, resetVotes, markQuestionAnswered } = vi.hoisted(() => ({
  subscribeSession: vi.fn(),
  subscribeQuestions: vi.fn(),
  updatePhase: vi.fn().mockResolvedValue(true),
  resetVotes: vi.fn().mockResolvedValue(true),
  markQuestionAnswered: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../firebase/config', () => ({
  isFirebaseConfigured: () => true,
  isDemoMode: () => false,
  signInAnonymouslyToFirebase: vi.fn().mockResolvedValue('host-1'),
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
  subscribeToFirestoreQuestions: (...args: unknown[]) => subscribeQuestions(...args),
  subscribeToMyVote: vi.fn().mockReturnValue(() => {}),
  updateFirestoreSessionPhase: (...args: unknown[]) => updatePhase(...args),
  resetQuestionVotes: (...args: unknown[]) => resetVotes(...args),
  markFirestoreQuestionAnswered: (...args: unknown[]) => markQuestionAnswered(...args),
}));

vi.mock('../../firebase/presence', () => ({
  goOnline: vi.fn(),
  goOffline: vi.fn(),
  subscribeToPresence: vi.fn().mockReturnValue(() => {}),
}));

function makeSession(overrides: Partial<Session>): Session {
  return {
    id: 'AL-TEST',
    hostUid: 'host-1',
    phase: 'setup',
    round: 1,
    currentQuestionId: null,
    config: { participants: 1, leaders: '', duration: 1, date: '', time: '', meetingLink: '', location: '' },
    ...overrides,
  };
}

function makeQuestion(overrides: Partial<Question> & { id: string }): Question {
  return {
    id: overrides.id,
    text: overrides.text ?? 'Question',
    avatarId: 'panda',
    votes: 0,
    answered: false,
    participantUid: null,
    ...overrides,
  };
}

function Probe() {
  const {
    joinSession,
    session,
    questions,
    closeVotingPickWinner,
    moveToAnswering,
    markAnswered,
    nextQuestion,
  } = useSession();

  return (
    <>
      <button type="button" onClick={() => void joinSession('AL-TEST')}>Join</button>
      <button type="button" onClick={() => void closeVotingPickWinner()}>Pick winner</button>
      <button type="button" onClick={() => void moveToAnswering()}>Move to answering</button>
      <button type="button" onClick={() => void markAnswered()}>That&apos;s been answered</button>
      <button type="button" onClick={() => void nextQuestion()}>Next question</button>
      <span data-testid="phase">{session?.phase ?? 'none'}</span>
      <span data-testid="round">{session?.round ?? 'none'}</span>
      <span data-testid="current">{session?.currentQuestionId ?? 'none'}</span>
      <span data-testid="answered">{questions.filter((q) => q.answered).map((q) => q.id).join(',')}</span>
    </>
  );
}

async function renderAndJoin() {
  subscribeSession.mockImplementation(() => () => {});
  subscribeQuestions.mockImplementation(() => () => {});
  render(
    <SessionProvider>
      <Probe />
    </SessionProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Join' }));
  await waitFor(() => expect(subscribeSession).toHaveBeenCalled());
  return {
    onSession: subscribeSession.mock.calls[0][1] as (session: Session) => void,
    onQuestions: subscribeQuestions.mock.calls[0][1] as (questions: Question[]) => void,
  };
}

describe('Host answering flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('picks the top-voted winner, streams answering, and marks answered into followup', async () => {
    const { onSession, onQuestions } = await renderAndJoin();

    act(() => {
      onSession(makeSession({ phase: 'voting', round: 1, currentQuestionId: null }));
      onQuestions([
        makeQuestion({ id: 'q1', text: 'Most wanted', votes: 5 }),
        makeQuestion({ id: 'q2', text: 'Second', votes: 3 }),
      ]);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Pick winner' }));
    await waitFor(() => expect(screen.getByTestId('phase').textContent).toBe('winner'));
    expect(screen.getByTestId('current').textContent).toBe('q1');
    expect(updatePhase).toHaveBeenCalledWith('AL-TEST', 'host-1', { currentQuestionId: 'q1', phase: 'winner' });

    fireEvent.click(screen.getByRole('button', { name: 'Move to answering' }));
    await waitFor(() => expect(screen.getByTestId('phase').textContent).toBe('answering'));
    expect(updatePhase).toHaveBeenCalledWith('AL-TEST', 'host-1', { phase: 'answering' });

    fireEvent.click(screen.getByRole('button', { name: "That's been answered" }));
    await waitFor(() => expect(screen.getByTestId('phase').textContent).toBe('followup'));
    expect(screen.getByTestId('answered').textContent).toBe('q1');
    expect(markQuestionAnswered).toHaveBeenCalledWith('AL-TEST', 'q1', 1);
  });

  it('rolls to a fresh voting round and resets votes when unanswered questions remain', async () => {
    const { onSession, onQuestions } = await renderAndJoin();

    act(() => {
      onSession(makeSession({ phase: 'followup', round: 1, currentQuestionId: 'q1' }));
      onQuestions([
        makeQuestion({ id: 'q1', text: 'First', votes: 12, answered: true }),
        makeQuestion({ id: 'q2', text: 'Second', votes: 7 }),
        makeQuestion({ id: 'q3', text: 'Third', votes: 7 }),
      ]);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));

    await waitFor(() => expect(resetVotes).toHaveBeenCalledWith('AL-TEST'));
    expect(updatePhase).toHaveBeenCalledWith('AL-TEST', 'host-1', { currentQuestionId: null, round: 2, phase: 'voting' });
    expect(screen.getByTestId('phase').textContent).toBe('voting');
    expect(screen.getByTestId('round').textContent).toBe('2');
    expect(screen.getByTestId('current').textContent).toBe('none');
  });

  it('ends the session when no unanswered questions remain and does not reset votes', async () => {
    const { onSession, onQuestions } = await renderAndJoin();

    act(() => {
      onSession(makeSession({ phase: 'followup', round: 1, currentQuestionId: 'q1' }));
      onQuestions([makeQuestion({ id: 'q1', text: 'Only', votes: 12, answered: true })]);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));

    await waitFor(() => expect(screen.getByTestId('phase').textContent).toBe('ended'));
    expect(resetVotes).not.toHaveBeenCalled();
  });
});