import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { isFirebaseConfigured } from '../firebase/config';
import {
  createFirestoreSession,
  subscribeToFirestoreSession,
  submitFirestoreQuestion,
  updateFirestoreSessionPhase,
  voteFirestoreQuestion,
  markFirestoreQuestionAnswered,
} from '../firebase/sessionService';

const SessionContext = createContext(null);

const STORAGE_SESSION_KEY = 'ask_leadership_session';
const STORAGE_ME_KEY = 'ask_leadership_me';

function generateSessionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `AL-${code.slice(0, 3)}${code.slice(3)}`;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function SessionProvider({ children }) {
  // Check URL query parameters (e.g. ?join=AL-XYZ)
  const queryParams = new URLSearchParams(window.location.search);
  const urlJoinCode = queryParams.get('join') || '';

  // Load stored state if available
  const [session, setSession] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SESSION_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      id: generateSessionCode(),
      mode: 'virtual',
      config: {
        participants: 25,
        leaders: 'Dara (VP Engineering), Wale (Head of People)',
        date: '',
        time: '',
        duration: 45,
        meetingLink: 'https://meet.gummygum.co/ask-leadership',
        location: 'The Commons, 4th Floor',
      },
      created: false,
      phase: 'setup',
      presence: 1,
      round: 1,
      questions: [],
      currentQuestionId: null,
    };
  });

  const [me, setMe] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ME_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      avatar: null,
      joined: false,
      myQuestionId: null,
      votedThisRound: false,
      justVotedId: null,
    };
  });

  const [view, setView] = useState(() => {
    if (urlJoinCode) return 'employeeInvite';
    return 'landing';
  });

  const [demoRole, setDemoRole] = useState(null);
  const [closingStep, setClosingStep] = useState(0);
  const [toasts, setToasts] = useState([]);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    } catch {
      // ignore
    }
  }, [session]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ME_KEY, JSON.stringify(me));
    } catch {
      // ignore
    }
  }, [me]);

  // Real-time Firestore sync when configured
  useEffect(() => {
    if (!isFirebaseConfigured() || !session.created || !session.id) return;

    const unsubscribe = subscribeToFirestoreSession(
      session.id,
      (remoteData) => {
        setSession((prev) => ({
          ...prev,
          ...remoteData,
        }));
      },
      (error) => {
        console.error('Firestore sync error:', error);
      }
    );

    return () => unsubscribe();
  }, [session.created, session.id]);

  const showToast = useCallback((msg) => {
    const id = uid();
    setToasts((prev) => [...prev, { id, text: msg }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  const activePool = session.questions.filter((q) => !q.answered);
  const submittedCount = session.questions.length;
  const answeredCount = session.questions.filter((q) => q.answered).length;
  const remainingCount = activePool.length;
  const currentQuestion = session.questions.find((q) => q.id === session.currentQuestionId) || null;

  const updateConfig = (patch) => {
    setSession((prev) => ({
      ...prev,
      config: { ...prev.config, ...patch },
    }));
  };

  const setSessionMode = (mode) => {
    setSession((prev) => ({ ...prev, mode }));
  };

  const sendInvitations = async () => {
    const updated = {
      ...session,
      created: true,
      phase: 'invited',
    };
    setSession(updated);

    if (isFirebaseConfigured()) {
      await createFirestoreSession(updated);
    }

    setView('hostReady');
  };

  const chooseAvatar = (avatarId) => {
    setMe((prev) => ({ ...prev, avatar: avatarId }));
  };

  const confirmEnterRoom = () => {
    setMe((prev) => ({ ...prev, joined: true }));
    setSession((prev) => ({
      ...prev,
      phase: prev.phase === 'setup' || prev.phase === 'invited' ? 'submitting' : prev.phase,
    }));
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

    setSession((prev) => ({
      ...prev,
      questions: [newQ, ...prev.questions],
    }));
    setMe((prev) => ({ ...prev, myQuestionId: newQ.id }));
    showToast('You just added your voice.');

    if (isFirebaseConfigured()) {
      await submitFirestoreQuestion(session.id, newQ);
    }
  };

  const openSubmissions = async () => {
    setSession((prev) => ({ ...prev, phase: 'submitting' }));
    if (isFirebaseConfigured()) {
      await updateFirestoreSessionPhase(session.id, { phase: 'submitting' });
    }
  };

  const closeSubmissions = async () => {
    setSession((prev) => ({ ...prev, phase: 'closed' }));
    if (isFirebaseConfigured()) {
      await updateFirestoreSessionPhase(session.id, { phase: 'closed' });
    }
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
    }));
    setMe((prev) => ({ ...prev, votedThisRound: false, justVotedId: null }));

    if (isFirebaseConfigured()) {
      await updateFirestoreSessionPhase(session.id, { phase: 'voting' });
    }
  };

  const voteQuestion = async (qid) => {
    if (me.votedThisRound) return;
    const target = session.questions.find((q) => q.id === qid);
    if (!target || target.mine) return;

    setSession((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === qid ? { ...q, votes: (q.votes || 0) + 1 } : q)),
    }));
    setMe((prev) => ({
      ...prev,
      votedThisRound: true,
      justVotedId: qid,
    }));
    showToast('You just voted.');

    if (isFirebaseConfigured()) {
      await voteFirestoreQuestion(session.id, qid, session.questions);
    }
  };

  const closeVotingPickWinner = async () => {
    const pool = session.questions.filter((q) => !q.answered);
    if (!pool.length) return;
    const winner = pool.reduce((a, b) => ((b.votes || 0) > (a.votes || 0) ? b : a));
    
    const patch = {
      currentQuestionId: winner.id,
      phase: 'winner',
    };
    setSession((prev) => ({
      ...prev,
      ...patch,
    }));

    if (isFirebaseConfigured()) {
      await updateFirestoreSessionPhase(session.id, patch);
    }
  };

  const moveToAnswering = async () => {
    setSession((prev) => ({ ...prev, phase: 'answering' }));
    if (isFirebaseConfigured()) {
      await updateFirestoreSessionPhase(session.id, { phase: 'answering' });
    }
  };

  const markAnswered = async () => {
    setSession((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === prev.currentQuestionId ? { ...q, answered: true } : q
      ),
      phase: 'followup',
    }));

    if (isFirebaseConfigured()) {
      await markFirestoreQuestionAnswered(session.id, session.currentQuestionId, session.questions);
    }
  };

  const nextQuestion = async () => {
    const unAnswered = session.questions.filter(
      (q) => !q.answered && q.id !== session.currentQuestionId
    );
    if (unAnswered.length > 0) {
      const patch = {
        currentQuestionId: null,
        round: session.round + 1,
        phase: 'voting',
      };
      setSession((prev) => ({
        ...prev,
        ...patch,
      }));
      setMe((prev) => ({ ...prev, votedThisRound: false, justVotedId: null }));

      if (isFirebaseConfigured()) {
        await updateFirestoreSessionPhase(session.id, patch);
      }
    } else {
      endSession();
    }
  };

  const endSession = async () => {
    setSession((prev) => ({ ...prev, phase: 'ended' }));
    setClosingStep(remainingCount > 0 || answeredCount < submittedCount ? 0 : 1);
    setView('closing');

    if (isFirebaseConfigured()) {
      await updateFirestoreSessionPhase(session.id, { phase: 'ended' });
    }
  };

  const restartDemo = () => {
    localStorage.removeItem(STORAGE_SESSION_KEY);
    localStorage.removeItem(STORAGE_ME_KEY);
    setSession({
      id: generateSessionCode(),
      mode: 'virtual',
      config: {
        participants: 25,
        leaders: 'Dara (VP Engineering), Wale (Head of People)',
        date: '',
        time: '',
        duration: 45,
        meetingLink: 'https://meet.gummygum.co/ask-leadership',
        location: 'The Commons, 4th Floor',
      },
      created: false,
      phase: 'setup',
      presence: 1,
      round: 1,
      questions: [],
      currentQuestionId: null,
    });
    setMe({
      avatar: null,
      joined: false,
      myQuestionId: null,
      votedThisRound: false,
      justVotedId: null,
    });
    setClosingStep(0);
    setDemoRole(null);
    setView('landing');
  };

  return (
    <SessionContext.Provider
      value={{
        view,
        setView,
        demoRole,
        setDemoRole,
        closingStep,
        setClosingStep,
        session,
        me,
        toasts,
        showToast,
        activePool,
        submittedCount,
        answeredCount,
        remainingCount,
        currentQuestion,
        updateConfig,
        setSessionMode,
        sendInvitations,
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
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return ctx;
}
