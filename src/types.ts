// Shared domain types for Ask Leadership.

// ── Avatars ──────────────────────────────────────────────────────────
export interface Avatar {
  id: string;
  emoji: string;
  color: string;
  name: string;
}

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
}

// ── Questions ────────────────────────────────────────────────────────
export interface Question {
  id: string;
  text: string;
  avatarId: string;
  votes: number;
  answered: boolean;
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
}

// ── View names ───────────────────────────────────────────────────────
export type ViewName =
  | 'landing'
  | 'hostSetup'
  | 'hostReady'
  | 'hostControl'
  | 'employeeInvite'
  | 'employeeWelcome'
  | 'avatarSelect'
  | 'room'
  | 'closing';

// ── SessionContext value ──────────────────────────────────────────────
export interface SessionContextValue {
  uid: string | null;
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
  showToast: (msg: string) => void;
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
  restartDemo: () => void;
  switchRole: (role: 'host' | 'employee') => void;
}

// ── Component prop helpers ───────────────────────────────────────────
export type ButtonVariant = 'primary' | 'ghost' | 'dark' | 'gold';
export type ButtonSize = 'default' | 'sm';
export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
export type TagPillVariant = 'purple' | 'sage' | 'dark';
