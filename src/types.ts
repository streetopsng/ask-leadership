// Shared domain types for Ask Leadership.

// ── Session ──────────────────────────────────────────────────────────
export type SessionPhase =
  | 'setup'
  | 'submitting'
  | 'closed'
  | 'voting'
  | 'winner'
  | 'answering'
  | 'followup'
  | 'ended'
  | 'invited';

export type SessionMode = 'virtual' | 'physical';

export interface SessionConfig {
  participants: number;
  leaders: string;
  duration: number;
  date: string;
  time: string;
  meetingLink: string;
  location: string;
  mode?: SessionMode;
}

export interface Session {
  id: string | null;
  hostUid: string | null;
  phase: SessionPhase;
  round: number;
  currentQuestionId: string | null;
  config: SessionConfig;
  mode?: SessionMode;
  createdAt?: unknown;
  updatedAt?: unknown;
  lastActivity?: unknown;
  abandoned?: boolean;
  cancelled?: boolean;
  hostedSessionId?: string | null;
}

// ── Questions ────────────────────────────────────────────────────────
export interface Question {
  id: string;
  text: string;
  avatarId: string;
  votes: number;
  answered: boolean;
  answeredRound?: number | null;
  participantUid: string | null;
  mine?: boolean;
  ts?: number;
  pending?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

// ── Votes ────────────────────────────────────────────────────────────
export interface VoteMarker {
  votedFor: string;
  createdAt?: unknown;
}

// ── Me (per-device participant identity) ──────────────────────────────
export interface Me {
  avatar: string | null;
  joined: boolean;
  myQuestionId: string | null;
  votedThisRound: boolean;
  justVotedId: string | null;
}

// ── Toast ────────────────────────────────────────────────────────────
export interface Toast {
  id: string;
  text: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ── View names ───────────────────────────────────────────────────────
export type ViewName =
  | 'landing'
  | 'hostSetup'
  | 'hostReady'
  | 'hostControl'
  | 'dashboard'
  | 'employeeInvite'
  | 'employeeWelcome'
  | 'avatarSelect'
  | 'room'
  | 'closing';

// ── GummyGum launch state ───────────────────────────────────────────
export type GgAccessState = 'checking' | 'granted' | 'denied';

// ── SessionContext value ──────────────────────────────────────────────
export interface SessionContextValue {
  uid: string | null;
  ggAccessState: GgAccessState;
  ggSession: import('./lib/gummygumSession').GummyGumLaunchSession | null;
  authStatus: 'idle' | 'signingIn' | 'signedIn' | 'error';
  authError: Error | null;
  retryAuthentication: () => void;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  joinError: Error | null;
  retryJoin: () => void;
  syncError: Error | null;
  retrySync: () => void;
  view: ViewName;
  setView: (v: ViewName) => void;
  demoRole: 'host' | 'employee' | null;
  setDemoRole: (r: 'host' | 'employee' | null) => void;
  closingStep: number;
  setClosingStep: (n: number) => void;
  session: Session | null;
  questions: Question[];
  me: Me;
  toasts: Toast[];
  presenceCount: number;
  sessionExpired: 'lobby' | 'game' | null;
  sessionEnded: 'ended' | 'completed' | null;
  questionSubmitLocked: boolean;
  questionSubmitCooldownMs: number;
  showToast: (msg: string, action?: Toast['action']) => void;
  activePool: Question[];
  submittedCount: number;
  answeredCount: number;
  remainingCount: number;
  currentQuestion: Question | null;
  updateConfig: (patch: Partial<SessionConfig>) => void;
  setSessionMode: (mode: SessionMode) => void;
  beginHostSetup: () => void;
  createSession: (config: SessionConfig) => Promise<void>;
  joinSession: (code: string) => Promise<void>;
  chooseAvatar: (avatarId: string) => void;
  confirmEnterRoom: () => void;
  submitQuestion: (text: string) => Promise<void>;
  openSubmissions: () => Promise<void>;
  closeSubmissions: () => Promise<void>;
  removeQuestion: (qid: string) => Promise<void>;
  startVoting: () => Promise<void>;
  voteQuestion: (qid: string) => Promise<void>;
  closeVotingPickWinner: () => Promise<void>;
  moveToAnswering: () => Promise<void>;
  markAnswered: () => Promise<void>;
  nextQuestion: () => Promise<void>;
  endSession: () => Promise<void>;
  cancelSessionForAll: () => Promise<void>;
  restartDemo: () => void;
  switchRole: (role: 'host' | 'employee') => void;
}

// ── Component prop helpers ───────────────────────────────────────────
export type ButtonVariant = 'primary' | 'ghost' | 'dark' | 'gold';
export type ButtonSize = 'default' | 'sm';
export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
export type TagPillVariant = 'purple' | 'sage' | 'dark';
