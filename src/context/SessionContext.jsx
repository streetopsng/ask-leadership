import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { isFirebaseConfigured, isDemoMode, signInAnonymouslyToFirebase } from '../firebase/config';
import {
  createFirestoreSession,
  getFirestoreSession,
  subscribeToFirestoreSession,
  submitFirestoreQuestion,
  voteFirestoreQuestion,
  markFirestoreQuestionAnswered,
  updateFirestoreSessionPhase,
} from '../firebase/sessionService';
import { goOnline, goOffline, subscribeToPresence } from '../firebase/presence';
import { AVATARS } from '../constants/avatars';
import { SAMPLE_QUESTIONS } from '../constants/seedData';

const SessionContext = createContext(null);

function generateSessionCode() {
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

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function getSeedQuestions() {
  const shuffled = [...SAMPLE_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4).map((text, idx) => ({
    id: uid(),
    text,
    avatarId: AVATARS[idx % AVATARS.length].id,
    votes: 0,
    answered: false,
    mine: false,
    ts: Date.now(),
  }));
}

export function SessionProvider({ children }) {
  const queryParams = new URLSearchParams(window.location.search);
  const urlJoinCode = queryParams.get('join') || '';

  const [uid_, setUid] = useState(null);
  const [session, setSession] = useState(null);
  const [view, setView] = useState('landing');
  const [demoRole, setDemoRole] = useState(null);
  const [closingStep, setClosingStep] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [presenceCount, setPresenceCount] = useState(0);
  const [me, setMe] = useState({ avatar: null, joined: false, myQuestionId: null, votedThisRound: false, justVotedId: null });
  const unsubRef = useRef(null);
  const unsubPresenceRef = useRef(null);

  // Auth on mount
  useEffect(() => {
    if (!isFirebaseConfigured() || isDemoMode()) {
      setUid(`demo-${uid()}`);
      return;
    }
    signInAnonymouslyToFirebase().then((id) => {
      if (id) setUid(id);
    });
  }, []);

  // Join session from URL on mount
  const joinSessionRef = useRef(joinSession);
  joinSessionRef.current = joinSession;

  useEffect(() => {
    if (urlJoinCode && uid_) {
      joinSessionRef.current(urlJoinCode);
    }
  }, [urlJoinCode, uid_]);

  // Subscribe to Firestore session when created/joined
  useEffect(() => {
    if (!session?.id || !isFirebaseConfigured() || isDemoMode()) return;

    unsubRef.current?.();
    unsubRef.current = subscribeToFirestoreSession(
      session.id,
      (remote) => setSession((prev) => ({ ...prev, ...remote })),
      (err) => console.error('Session sync error:', err)
    );

    return () => unsubRef.current?.();
  }, [session?.id]);

  // Subscribe to presence
  useEffect(() => {
    if (!session?.id || !uid_ || !isFirebaseConfigured() || isDemoMode()) return;

    goOnline(session.id, uid_);
    unsubPresenceRef.current = subscribeToPresence(session.id, setPresenceCount);

    return () => {
      goOffline(session.id, uid_);
      unsubPresenceRef.current?.();
    };
  }, [session?.id, uid_]);

  const isSyncEnabled = isFirebaseConfigured() && !isDemoMode();

  const syncToFirestore = useCallback(async (op) => {
    if (!isSyncEnabled) return;
    try {
      await op();
    } catch (err) {
      console.error('Firestore sync error:', err);
    }
  }, [isSyncEnabled]);

  const showToast = useCallback((msg) => {
    const id = uid();
    setToasts((prev) => [...prev, { id, text: msg }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2500);
  }, []);

  const activePool = session?.questions?.filter((q) => !q.answered) || [];
  const submittedCount = session?.questions?.length || 0;
  const answeredCount = session?.questions?.filter((q) => q.answered).length || 0;
  const remainingCount = activePool.length;
  const currentQuestion = session?.questions?.find((q) => q.id === session?.currentQuestionId) || null;

  const updateConfig = (patch) => {
    setSession((prev) => prev ? { ...prev, config: { ...prev.config, ...patch } } : prev);
  };

  const setSessionMode = (mode) => {
    setSession((prev) => prev ? { ...prev, mode } : prev);
  };

  const createSession = useCallback(async (config) => {
    const id = generateSessionCode();
    const newSession = {
      id,
      hostUid: uid_,
      phase: 'setup',
      round: 1,
      currentQuestionId: null,
      config,
      questions: [],
    };

    setSession(newSession);
    setView('hostControl');

    await syncToFirestore(() => createFirestoreSession(id, uid_, config));
  }, [uid_]);

  const joinSession = useCallback(async (code) => {
    if (isFirebaseConfigured() && !isDemoMode()) {
      const remote = await getFirestoreSession(code);
      if (!remote) {
        showToast('Session not found');
        return;
      }
      setSession({ ...remote, questions: remote.questions || [] });
      setView('avatarSelect');
    } else {
      // Demo mode: create local session
      setSession({
        id: code,
        hostUid: null,
        phase: 'setup',
        round: 1,
        currentQuestionId: null,
        config: { participants: 25, leaders: 'Dara, Wale', duration: 45 },
        questions: [],
        created: true,
      });
      setView('avatarSelect');
    }
  }, [showToast]);

  const chooseAvatar = (avatarId) => {
    setMe((prev) => ({ ...prev, avatar: avatarId }));
  };

  const confirmEnterRoom = () => {
    setMe((prev) => ({ ...prev, joined: true }));
    setSession((prev) => {
      const questions = prev.questions.length === 0 ? getSeedQuestions() : prev.questions;
      return { ...prev, phase: 'submitting', questions };
    });
    setView('room');
  };

  const submitQuestion = async (text) => {
    if (!text.trim()) {
      showToast('Type your question first');
      return;
    }
    const newQ = {
      id: uid(),
      text: text.trim(),
      avatarId: me.avatar,
      votes: 0,
      answered: false,
      mine: true,
      ts: Date.now(),
    };

    setSession((prev) => ({ ...prev, questions: [newQ, ...prev.questions] }));
    setMe((prev) => ({ ...prev, myQuestionId: newQ.id }));
    showToast('You just added your voice.');

    await syncToFirestore(() => submitFirestoreQuestion(session.id, uid_, newQ));
  };

  const openSubmissions = async () => {
    setSession((prev) => ({ ...prev, phase: 'submitting' }));
    await syncToFirestore(() => updateFirestoreSessionPhase(session.id, uid_, { phase: 'submitting' }));
  };

  const closeSubmissions = async () => {
    setSession((prev) => ({ ...prev, phase: 'closed' }));
    await syncToFirestore(() => updateFirestoreSessionPhase(session.id, uid_, { phase: 'closed' }));
  };

  const removeQuestion = (qid) => {
    setSession((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== qid),
    }));
  };

  const startVoting = async () => {
    setSession((prev) => ({
      ...prev,
      phase: 'voting',
      questions: prev.questions.map((q) => (!q.answered ? { ...q, votes: 0 } : q)),
    }));
    setMe((prev) => ({ ...prev, votedThisRound: false, justVotedId: null }));

    await syncToFirestore(() => updateFirestoreSessionPhase(session.id, uid_, { phase: 'voting' }));
  };

  const voteQuestion = async (qid) => {
    if (me.votedThisRound) return;
    const target = session.questions.find((q) => q.id === qid);
    if (!target || target.mine) return;

    setSession((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === qid ? { ...q, votes: (q.votes || 0) + 1 } : q)),
    }));
    setMe((prev) => ({ ...prev, votedThisRound: true, justVotedId: qid }));
    showToast('You just voted.');

    await syncToFirestore(() => voteFirestoreQuestion(session.id, qid, session.round, uid_));
  };

  const closeVotingPickWinner = async () => {
    const pool = session.questions.filter((q) => !q.answered);
    if (!pool.length) return;
    const winner = pool.reduce((a, b) => ((b.votes || 0) > (a.votes || 0) ? b : a));

    setSession((prev) => ({ ...prev, currentQuestionId: winner.id, phase: 'winner' }));

    await syncToFirestore(() => updateFirestoreSessionPhase(session.id, uid_, { currentQuestionId: winner.id, phase: 'winner' }));
  };

  const moveToAnswering = async () => {
    setSession((prev) => ({ ...prev, phase: 'answering' }));
    await syncToFirestore(() => updateFirestoreSessionPhase(session.id, uid_, { phase: 'answering' }));
  };

  const markAnswered = async () => {
    setSession((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === prev.currentQuestionId ? { ...q, answered: true } : q)),
      phase: 'followup',
    }));

    await syncToFirestore(() => markFirestoreQuestionAnswered(session.id, session.currentQuestionId));
  };

  const nextQuestion = async () => {
    const unAnswered = session.questions.filter((q) => !q.answered && q.id !== session.currentQuestionId);
    if (unAnswered.length > 0) {
      const patch = { currentQuestionId: null, round: session.round + 1, phase: 'voting' };
      setSession((prev) => ({ ...prev, ...patch }));
      setMe((prev) => ({ ...prev, votedThisRound: false, justVotedId: null }));

      await syncToFirestore(() => updateFirestoreSessionPhase(session.id, uid_, patch));
    } else {
      endSession();
    }
  };

  const endSession = async () => {
    setSession((prev) => ({ ...prev, phase: 'ended' }));
    setClosingStep(remainingCount > 0 || answeredCount < submittedCount ? 0 : 1);
    setView('closing');

    await syncToFirestore(() => updateFirestoreSessionPhase(session.id, uid_, { phase: 'ended' }));
  };

  const restartDemo = () => {
    setSession(null);
    setMe({ avatar: null, joined: false, myQuestionId: null, votedThisRound: false, justVotedId: null });
    setClosingStep(0);
    setDemoRole(null);
    setView('landing');
  };

  const switchRole = useCallback((role) => {
    setDemoRole(role);
    if (role === 'host') {
      setView(session ? 'hostControl' : 'hostSetup');
    } else {
      if (me.joined) setView('room');
      else if (me.avatar) setView('avatarSelect');
      else setView('employeeWelcome');
    }
  }, [session, me.joined, me.avatar]);

  const value = {
    uid: uid_,
    view,
    setView,
    demoRole,
    setDemoRole,
    closingStep,
    setClosingStep,
    session,
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

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
