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
  isFirestoreSessionAbandoned,
  touchFirestoreSession,
  markFirestoreSessionAbandoned,
} from '../firebase/sessionService';
import { applyQuestionSnapshot, isLobbyIdleExpired, withMine } from './sessionModel';
import { timestampMillis } from '../lib/timestamps';
import { goOnline, goOffline, subscribeToPresence } from '../firebase/presence';
import { AVATARS } from '../constants/avatars';
import { SAMPLE_QUESTIONS } from '../constants/seedData';
import { resolveGummyGumLaunch, reportGummyGumCancel, reportGummyGumResult, type GummyGumLaunchSession } from '../lib/gummygumSession';
import type { Session, Question, Me, Toast, ViewName, SessionConfig, SessionContextValue, GgAccessState } from '../types';

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

const HEARTBEAT_INTERVAL_MS = 60 * 1000;

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
  const [questionSubmitCooldownUntil, setQuestionSubmitCooldownUntil] = useState<number | null>(null);
  const [questionSubmitCooldownMs, setQuestionSubmitCooldownMs] = useState(0);
  const [me, setMe] = useState<Me>({ avatar: null, joined: false, myQuestionId: null, votedThisRound: false, justVotedId: null });
  const [ggSession, setGgSession] = useState<GummyGumLaunchSession | null>(null);
  const [ggAccessState, setGgAccessState] = useState<GgAccessState>(isDemoMode() ? 'granted' : 'checking');
  const ggRoutedRef = useRef(false);
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

  // Verify the GummyGum launch token (or resume a stored launch session) on mount.
  // Demo mode is an explicit offline/pitch feature (see README) so it bypasses the gate.
  useEffect(() => {
    if (isDemoMode()) return;
    resolveGummyGumLaunch().then((gg) => {
      setGgSession(gg);
      setGgAccessState(gg ? 'granted' : 'denied');
    });
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

  const isHost = !!session?.hostUid && session.hostUid === uid_;

  // Checked once per session, before the host heartbeat starts, so a returning host can't mask abandonment.
  const [abandonCheck, setAbandonCheck] = useState<{ id: string; abandoned: boolean } | null>(null);
  const abandonCheckedRef = useRef<string | null>(null);
  useEffect(() => {
    const sessionId = session?.id;
    if (!sessionId || !uid_ || !isSyncEnabled || abandonCheckedRef.current === sessionId) return;
    abandonCheckedRef.current = sessionId;
    (async () => {
      let abandoned = false;
      try {
        abandoned = await isFirestoreSessionAbandoned(sessionId);
      } catch (err) {
        console.error('Abandoned-session check failed:', err);
      }
      setAbandonCheck({ id: sessionId, abandoned });
    })();
  }, [session?.id, uid_, isSyncEnabled]);

  const isAbandoned =
    !!session?.abandoned || (!!abandonCheck && abandonCheck.id === session?.id && abandonCheck.abandoned);
  const abandonCheckPassed = !!abandonCheck && abandonCheck.id === session?.id && !abandonCheck.abandoned;

  useEffect(() => {
    const sessionId = session?.id;
    if (!sessionId || !isHost || !abandonCheckPassed || isAbandoned || !isSyncEnabled) return;
    const beat = async () => {
      try {
        await touchFirestoreSession(sessionId);
      } catch {
        // next beat retries
      }
    };
    void beat();
    const timer = window.setInterval(() => void beat(), HEARTBEAT_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [session?.id, isHost, abandonCheckPassed, isAbandoned, isSyncEnabled]);

  // Host persists the flag for everyone and reports the session to GummyGum as cancelled, once.
  const abandonHandledRef = useRef(false);
  useEffect(() => {
    const sessionId = session?.id;
    if (!sessionId || !isAbandoned || !isHost || abandonHandledRef.current) return;
    abandonHandledRef.current = true;
    if (!session?.abandoned) {
      void (async () => {
        try {
          await markFirestoreSessionAbandoned(sessionId);
        } catch (err) {
          console.error('Could not mark session abandoned:', err);
        }
      })();
    }
    if (ggSession?.isHost) void reportGummyGumCancel();
  }, [session?.id, session?.abandoned, isAbandoned, isHost, ggSession]);

  const [lobbyNow, setLobbyNow] = useState(() => Date.now());
  const sessionPhase = session?.phase;
  const createdAtMs = timestampMillis(session?.createdAt);
  useEffect(() => {
    if (!isSyncEnabled || sessionPhase !== 'setup' || !createdAtMs) return;
    const timer = window.setInterval(() => setLobbyNow(Date.now()), 10_000);
    return () => window.clearInterval(timer);
  }, [isSyncEnabled, sessionPhase, createdAtMs]);
  const lobbyExpired = isSyncEnabled && isLobbyIdleExpired(sessionPhase, createdAtMs, lobbyNow);

  const sessionExpired: 'lobby' | 'game' | null = isAbandoned ? 'game' : lobbyExpired ? 'lobby' : null;

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

  useEffect(() => {
    if (questionSubmitCooldownUntil === null) return;

    const tick = () => {
      const remaining = Math.max(0, questionSubmitCooldownUntil - Date.now());
      setQuestionSubmitCooldownMs(remaining);
      if (remaining === 0) setQuestionSubmitCooldownUntil(null);
    };

    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [questionSubmitCooldownUntil]);

  const questionSubmitLocked = questionSubmitCooldownMs > 0;

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

  // GummyGum-launched host: the room's config was already collected in the
  // hub's setup modal, so skip the manual hostSetup/hostReady screens and
  // resume (or create) the room directly using the hub's own room code.
  const beginGummyGumHostSession = useCallback(
    async (gg: GummyGumLaunchSession) => {
      const code = gg.roomCode;
      if (!code) return;
      const cfg: SessionConfig = { ...DRAFT_CONFIG, ...((gg.config as Partial<SessionConfig> | null) ?? {}) };

      if (isSyncEnabled) {
        try {
          const existing = await getFirestoreSession(code);
          if (existing) {
            setSession(existing);
            setQuestions([]);
            setView(existing.phase === 'ended' ? 'closing' : 'hostControl');
            return;
          }
        } catch {
          // fall through to create a fresh room below
        }
      }

      const newSession: Session = {
        id: code,
        hostUid: uid_,
        phase: 'setup',
        round: 1,
        currentQuestionId: null,
        config: cfg,
      };
      setSession(newSession);
      setQuestions([]);
      setView('hostControl');
      await syncToFirestore(() => createFirestoreSession(code, uid_!, cfg));
    },
    [uid_, isSyncEnabled, syncToFirestore]
  );

  // Route a resolved GummyGum launch into the right flow: host resumes/creates
  // the room, participant joins it directly by the hub's room code.
  useEffect(() => {
    if (ggRoutedRef.current) return;
    if (ggAccessState !== 'granted' || !ggSession || !uid_ || authStatus !== 'signedIn') return;
    ggRoutedRef.current = true;
    if (ggSession.isHost) {
      void beginGummyGumHostSession(ggSession);
    } else if (ggSession.roomCode) {
      void joinSession(ggSession.roomCode);
    }
  }, [ggAccessState, ggSession, uid_, authStatus, beginGummyGumHostSession, joinSession]);

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

    const now = Date.now();
    if (questionSubmitCooldownUntil && now < questionSubmitCooldownUntil) {
      const remainingSeconds = Math.max(1, Math.ceil((questionSubmitCooldownUntil - now) / 1000));
      showToast(`Please slow down. Try again in ${remainingSeconds}s.`);
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
      ts: now,
    };

    setQuestionSubmitCooldownUntil(now + 10_000);
    setQuestions((prev) => [{ ...newQ, mine: true }, ...prev]);
    setMe((prev) => ({ ...prev, myQuestionId: newQ.id }));
    showToast('You just added your voice.');

    const ok = await syncToFirestore(() => submitFirestoreQuestion(session!.id!, uid_!, newQ));
    if (ok === false) {
      setQuestionSubmitCooldownUntil(now + 10_000);
      setQuestions((prev) => prev.filter((q) => q.id !== newQ.id));
      setMe((prev) => ({ ...prev, myQuestionId: null }));
      showToast('Please slow down. Try again in a few seconds.');
    }
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
    const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    patchSession({ phase: 'ended' });
    setClosingStep(remainingCount > 0 || answeredCount < submittedCount ? 0 : 1);
    setView('closing');

    if (ggSession?.isHost) {
      void reportGummyGumResult({
        score: answeredCount,
        submittedCount,
        answeredCount,
        remainingCount,
        name: ggSession.player?.name || 'Host',
      });
    }

    await syncToFirestore(() => updateFirestoreSessionPhase(session!.id!, uid_!, { phase: 'ended', expireAt: sessionExpiry }));
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
    ggAccessState,
    ggSession,
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
    sessionExpired,
    questionSubmitLocked,
    questionSubmitCooldownMs,
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
