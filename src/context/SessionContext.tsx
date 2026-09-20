import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { isFirebaseConfigured, isDemoMode, signInAnonymouslyToFirebase } from '../firebase/config';
import {
  createFirestoreSession,
  getFirestoreSession,
  subscribeToFirestoreSession,
  subscribeToFirestoreQuestions,
  subscribeToMyVote,
  submitFirestoreQuestion,
  voteFirestoreQuestion,
  markFirestoreQuestionAnswered,
  updateFirestoreSessionPhase,
  resetQuestionVotes,
  deleteFirestoreQuestion,
} from '../firebase/sessionService';
import { applyQuestionSnapshot, withMine } from './sessionModel';
import { goOnline, goOffline, subscribeToPresence } from '../firebase/presence';
import { AVATARS } from '../constants/avatars';
import { SAMPLE_QUESTIONS } from '../constants/seedData';
import type { Session, Question, Me, Toast, ViewName, SessionConfig, SessionContextValue } from '../types';

const SessionContext = createContext<SessionContextValue | null>(null);

function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 3; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  let code2 = '';
  for (let i = 0; i < 3; i++) {
    code2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `AL-${code}${code2}`;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

const DRAFT_CONFIG: SessionConfig = {
  participants: 25,
  leaders: '',
  duration: 45,
  date: '',
  time: '',
  meetingLink: '',
  location: '',
};

function getSeedQuestions(): Question[] {
  const shuffled = [...SAMPLE_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4).map((text, idx) => ({
    id: uid(),
    text,
    avatarId: AVATARS[idx % AVATARS.length].id,
    votes: 0,
    answered: false,
    participantUid: null,
    mine: false,
    ts: Date.now(),
  }));
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryParams = new URLSearchParams(window.location.search);
  const urlJoinCode = queryParams.get('join') || '';

  const [uid_, setUid] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [view, setView] = useState<ViewName>('landing');
  const [demoRole, setDemoRole] = useState<'host' | 'employee' | null>(null);
  const [closingStep, setClosingStep] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [presenceCount, setPresenceCount] = useState(0);
  const [authStatus, setAuthStatus] = useState<'idle' | 'signingIn' | 'signedIn' | 'error'>(() =>
    isFirebaseConfigured() && !isDemoMode() ? 'signingIn' : 'signedIn'
  );
  const [authError, setAuthError] = useState<Error | null>(null);
  const [authAttempt, setAuthAttempt] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [joinError, setJoinError] = useState<Error | null>(null);
  const [syncError, setSyncError] = useState<Error | null>(null);
  const [syncRevision, setSyncRevision] = useState(0);
  const [me, setMe] = useState<Me>({ avatar: null, joined: false, myQuestionId: null, votedThisRound: false, justVotedId: null });
  const unsubSessionRef = useRef<(() => void) | null>(null);
  const unsubQuestionsRef = useRef<(() => void) | null>(null);
  const unsubMyVoteRef = useRef<(() => void) | null>(null);
  const unsubPresenceRef = useRef<(() => void) | null>(null);
  const toastTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const syncToFirestoreRef = useRef<(<T,>(op: () => Promise<T>) => Promise<T | undefined | null>) | null>(null);

  const isSyncEnabled = isFirebaseConfigured() && !isDemoMode();

  const retrySync = useCallback(() => {
    setSyncError(null);
    setSyncRevision((revision) => revision + 1);
  }, []);

  const handleListenerError = useCallback((err: Error) => {
    console.error('Firestore sync error:', err);
    setSyncError(err);
  }, []);

  const retryAuthentication = useCallback(() => {
    setAuthError(null);
    setAuthStatus('signingIn');
    setAuthAttempt((attempt) => attempt + 1);
  }, []);

  const patchSession = useCallback((patch: Partial<Session>) => {
    setSession((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  // Auth on mount
  useEffect(() => {
    if (!isFirebaseConfigured() || isDemoMode()) {
      // eslint-disable-next-line react/set-state-in-effect -- intentional demo mode init
      setUid(`demo-${uid()}`);
      setAuthStatus('signedIn');
      return;
    }
    let cancelled = false;
    setAuthStatus('signingIn');
    setAuthError(null);
    signInAnonymouslyToFirebase().then((id) => {
      if (cancelled) return;
      if (!id) {
        setAuthError(new Error('Could not initialize anonymous identity.'));
        setAuthStatus('error');
        return;
      }
      setUid(id);
      if (urlJoinCode) setSyncStatus('syncing');
      setAuthStatus('signedIn');
    }).catch((err: unknown) => {
      if (cancelled) return;
      setAuthError(err instanceof Error ? err : new Error('Could not initialize anonymous identity.'));
      setAuthStatus('error');
    });
    return () => {
      cancelled = true;
    };
  }, [authAttempt, urlJoinCode]);

  // Subscribe to the session doc
  useEffect(() => {
    if (!session?.id || !isSyncEnabled) return;

    const unsubscribe = subscribeToFirestoreSession(
      session.id,
      (remote) => patchSession(remote),
      handleListenerError
    );
    unsubSessionRef.current = unsubscribe;

    return unsubscribe;
  }, [session?.id, isSyncEnabled, patchSession, handleListenerError, syncRevision]);

  // Subscribe to the live questions feed
  useEffect(() => {
    if (!session?.id || !isSyncEnabled) return;

    const unsubscribe = subscribeToFirestoreQuestions(
      session.id,
      (raw) => setQuestions((prev) => applyQuestionSnapshot(prev, raw)),
      handleListenerError
    );
    unsubQuestionsRef.current = unsubscribe;

    return unsubscribe;
  }, [session?.id, isSyncEnabled, handleListenerError, syncRevision]);

  // Subscribe to my own vote marker for the current round
  useEffect(() => {
    if (!session?.id || !session?.round || !uid_ || !isSyncEnabled) return;

    const unsubscribe = subscribeToMyVote(
      session.id,
      session.round,
      uid_,
      (marker) =>
        setMe((prev) => ({
          ...prev,
          votedThisRound: !!marker,
          justVotedId: marker ? marker.votedFor : null,
        })),
      handleListenerError
    );
    unsubMyVoteRef.current = unsubscribe;

    return unsubscribe;
  }, [session?.id, session?.round, uid_, isSyncEnabled, handleListenerError, syncRevision]);

  // Subscribe to presence
  useEffect(() => {
    if (!session?.id || !uid_ || !isSyncEnabled) return;

    goOnline(session.id, uid_);
    const unsubscribe = subscribeToPresence(session.id, setPresenceCount);
    unsubPresenceRef.current = unsubscribe;

    const sessionId = session.id;
    return () => {
      goOffline(sessionId, uid_);
      unsubscribe();
    };
  }, [session?.id, uid_, isSyncEnabled, syncRevision]);

  const showToast = useCallback((msg: string, action?: Toast['action']) => {
    const id = uid();
    setToasts((prev) => [...prev, { id, text: msg, action }]);
    const timeout = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      toastTimeoutsRef.current.delete(id);
    }, 2500);
    toastTimeoutsRef.current.set(id, timeout);
  }, []);

  const syncToFirestore = useCallback(
    async <T,>(op: () => Promise<T>): Promise<T | undefined | null> => {
      if (!isSyncEnabled) return undefined;
      try {
        return await op();
      } catch (err) {
        console.error('Firestore sync error:', err);
        showToast('Could not save your change.', {
          label: 'Retry',
          onClick: () => void syncToFirestoreRef.current?.(op),
        });
        return null;
      }
    },
    [isSyncEnabled, showToast]
  );

  useEffect(() => {
    syncToFirestoreRef.current = syncToFirestore;
  });

  const questionsWithMine = useMemo(() => withMine(questions, uid_), [questions, uid_]);

  const activePool = questionsWithMine.filter((q) => !q.answered);
  const submittedCount = questionsWithMine.length;
  const answeredCount = questionsWithMine.filter((q) => q.answered).length;
  const remainingCount = activePool.length;
  const currentQuestion = questionsWithMine.find((q) => q.id === session?.currentQuestionId) || null;

  const updateConfig = (patch: Partial<SessionConfig>) => {
    setSession((prev) => (prev ? { ...prev, config: { ...prev.config, ...patch } } : prev));
  };

  const setSessionMode = (mode: SessionConfig['mode']) => {
    updateConfig({ mode });
  };

  const beginHostSetup = useCallback(() => {
    setSession({
      id: null,
      hostUid: uid_,
      phase: 'setup',
      round: 1,
      currentQuestionId: null,
      config: DRAFT_CONFIG,
    });
    setQuestions([]);
    setView('hostSetup');
  }, [uid_]);

  const createSession = useCallback(
    async (config: SessionConfig) => {
      const id = generateSessionCode();
      const newSession: Session = {
        id,
        hostUid: uid_,
        phase: 'setup',
        round: 1,
        currentQuestionId: null,
        config,
      };

      setSession(newSession);
      setQuestions([]);
      setView('hostControl');

      await syncToFirestore(() => createFirestoreSession(id, uid_!, config));
    },
    [uid_, syncToFirestore]
  );

  const joinSession = useCallback(
    async (code: string) => {
      if (isSyncEnabled) {
        setSyncStatus('syncing');
        setJoinError(null);
        try {
          const remote = await getFirestoreSession(code);
          if (!remote) {
            setJoinError(new Error('Session not found.'));
            setSyncStatus('error');
            return;
          }
          setSession(remote);
          setQuestions([]);
          setView('avatarSelect');
          setSyncStatus('synced');
        } catch (err) {
          setJoinError(err instanceof Error ? err : new Error('Could not join the room.'));
          setSyncStatus('error');
        }
      } else {
        setSession({
          id: code,
          hostUid: null,
          phase: 'setup',
          round: 1,
          currentQuestionId: null,
          config: { participants: 25, leaders: 'Dara, Wale', duration: 45, date: '', time: '', meetingLink: '', location: '' },
        });
        setQuestions([]);
        setView('avatarSelect');
        setSyncStatus('synced');
      }
    },
    [isSyncEnabled]
  );

  const retryJoin = useCallback(() => {
    if (urlJoinCode) void joinSession(urlJoinCode);
  }, [urlJoinCode, joinSession]);

  // Join session from URL on mount
  useEffect(() => {
    if (urlJoinCode && uid_ && authStatus === 'signedIn') {
      // eslint-disable-next-line react/set-state-in-effect -- intentional URL join on mount
      void joinSession(urlJoinCode);
    }
  }, [urlJoinCode, uid_, authStatus, joinSession]);

  const chooseAvatar = (avatarId: string) => {
    setMe((prev) => ({ ...prev, avatar: avatarId }));
  };

  const confirmEnterRoom = () => {
    setMe((prev) => ({ ...prev, joined: true }));
    if (!isSyncEnabled) {
      setQuestions((prev) => (prev.length === 0 ? getSeedQuestions() : prev));
    }
    setView('room');
  };

  const submitQuestion = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      showToast('Type your question first');
      return;
    }
    const newQ: Question = {
      id: uid(),
      text: trimmed,
      avatarId: me.avatar ?? 'panda',
      votes: 0,
      answered: false,
      participantUid: uid_,
      pending: true,
      ts: Date.now(),
    };

    setQuestions((prev) => [{ ...newQ, mine: true }, ...prev]);
    setMe((prev) => ({ ...prev, myQuestionId: newQ.id }));
    showToast('You just added your voice.');

    await syncToFirestore(() => submitFirestoreQuestion(session!.id!, uid_!, newQ));
  };

  const openSubmissions = async () => {
    patchSession({ phase: 'submitting' });
    await syncToFirestore(() => updateFirestoreSessionPhase(session!.id!, uid_!, { phase: 'submitting' }));
  };

  const closeSubmissions = async () => {
    patchSession({ phase: 'closed' });
    await syncToFirestore(() => updateFirestoreSessionPhase(session!.id!, uid_!, { phase: 'closed' }));
  };

  const removeQuestion = async (qid: string) => {
    const target = questions.find((q) => q.id === qid);
    setQuestions((prev) => prev.filter((q) => q.id !== qid));
    if (target) {
      await syncToFirestore(() => deleteFirestoreQuestion(session!.id!, qid));
    }
  };

  const beginVotingRound = async () => {
    const nextRound = (session?.round ?? 0) + 1;
    const patch = { currentQuestionId: null, round: nextRound, phase: 'voting' as const };
    patchSession(patch);
    setMe((prev) => ({ ...prev, votedThisRound: false, justVotedId: null }));
    if (!isSyncEnabled) {
      setQuestions((prev) => prev.map((q) => (!q.answered ? { ...q, votes: 0 } : q)));
    }

    await syncToFirestore(async () => {
      await updateFirestoreSessionPhase(session!.id!, uid_!, patch);
      await resetQuestionVotes(session!.id!);
    });
  };

  const startVoting = async () => {
    await beginVotingRound();
  };

  const voteQuestion = async (qid: string) => {
    if (me.votedThisRound) return;
    const target = questionsWithMine.find((q) => q.id === qid);
    if (!target || target.mine) return;

    if (!isSyncEnabled) {
      setQuestions((prev) => prev.map((q) => (q.id === qid ? { ...q, votes: (q.votes || 0) + 1 } : q)));
      setMe((prev) => ({ ...prev, votedThisRound: true, justVotedId: qid }));
      showToast('You just voted.');
      return;
    }

    setMe((prev) => ({ ...prev, votedThisRound: true, justVotedId: qid }));
    const ok = await syncToFirestore(() => voteFirestoreQuestion(session!.id!, qid, session!.round, uid_!));
    if (ok === false) {
      showToast('You already voted this round.');
      setMe((prev) => (prev.justVotedId === qid ? { ...prev, votedThisRound: false, justVotedId: null } : prev));
    }
  };

  const closeVotingPickWinner = async () => {
    const pool = questionsWithMine.filter((q) => !q.answered);
    if (!pool.length) return;
    const winner = pool.reduce((a, b) => ((b.votes || 0) > (a.votes || 0) ? b : a));

    patchSession({ currentQuestionId: winner.id, phase: 'winner' });

    await syncToFirestore(() => updateFirestoreSessionPhase(session!.id!, uid_!, { currentQuestionId: winner.id, phase: 'winner' }));
  };

  const moveToAnswering = async () => {
    patchSession({ phase: 'answering' });
    await syncToFirestore(() => updateFirestoreSessionPhase(session!.id!, uid_!, { phase: 'answering' }));
  };

  const markAnswered = async () => {
    setQuestions((prev) => prev.map((q) => (q.id === session?.currentQuestionId ? { ...q, answered: true, answeredRound: session.round } : q)));
    patchSession({ phase: 'followup' });

    await syncToFirestore(() => markFirestoreQuestionAnswered(session!.id!, session!.currentQuestionId!, session!.round));
  };

  const nextQuestion = async () => {
    const unAnswered = questionsWithMine.filter((q) => !q.answered && q.id !== session?.currentQuestionId);
    if (unAnswered.length > 0) {
      await beginVotingRound();
    } else {
      endSession();
    }
  };

  const endSession = async () => {
    patchSession({ phase: 'ended' });
    setClosingStep(remainingCount > 0 || answeredCount < submittedCount ? 0 : 1);
    setView('closing');

    await syncToFirestore(() => updateFirestoreSessionPhase(session!.id!, uid_!, { phase: 'ended' }));
  };

  const restartDemo = () => {
    setSyncError(null);
    setSession(null);
    setQuestions([]);
    setMe({ avatar: null, joined: false, myQuestionId: null, votedThisRound: false, justVotedId: null });
    setClosingStep(0);
    setDemoRole(null);
    setView('landing');
  };

  const switchRole = useCallback(
    (role: 'host' | 'employee') => {
      setDemoRole(role);
      if (role === 'host') {
        if (session) setView('hostControl');
        else beginHostSetup();
      } else {
        if (me.joined) setView('room');
        else if (me.avatar) setView('avatarSelect');
        else setView('employeeWelcome');
      }
    },
    [session, me.joined, me.avatar, beginHostSetup]
  );

  const value: SessionContextValue = {
    uid: uid_,
    authStatus,
    authError,
    retryAuthentication,
    syncStatus,
    joinError,
    retryJoin,
    syncError,
    retrySync,
    view,
    setView,
    demoRole,
    setDemoRole,
    closingStep,
    setClosingStep,
    session,
    questions: questionsWithMine,
    me,
    toasts,
    presenceCount,
    showToast,
    activePool,
    submittedCount,
    answeredCount,
    remainingCount,
    currentQuestion,
    updateConfig,
    setSessionMode,
    beginHostSetup,
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
  };

  // Cleanup toast timeouts and subscriptions on unmount
  useEffect(() => {
    const timeouts = toastTimeoutsRef.current;
    const unsubSession = unsubSessionRef.current;
    const unsubQuestions = unsubQuestionsRef.current;
    const unsubMyVote = unsubMyVoteRef.current;
    const unsubPresence = unsubPresenceRef.current;
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
      timeouts.clear();
      unsubSession?.();
      unsubQuestions?.();
      unsubMyVote?.();
      unsubPresence?.();
    };
  }, []);

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
