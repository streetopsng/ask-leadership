import React from 'react';
import { useSession } from '../../context/SessionContext';
import Button from '../common/Button';
import AvatarBlob from '../common/AvatarBlob';
import { Pill } from '../common/Pill';
import { MicIcon } from '../../constants/icons';

export default function HostControlView() {
  const {
    session,
    questions,
    setView,
    submittedCount,
    answeredCount,
    remainingCount,
    currentQuestion,
    openSubmissions,
    closeSubmissions,
    startVoting,
    closeVotingPickWinner,
    moveToAnswering,
    markAnswered,
    nextQuestion,
    endSession,
    removeQuestion,
    restartDemo,
  } = useSession();

  const { phase, presence } = session;

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[280px_1fr] bg-cream">
      {/* Sidebar */}
      <aside className="bg-cream-2 border-b-[2.5px] md:border-b-0 md:border-r-[2.5px] border-ink p-6 flex flex-col gap-5">
        <div>
          <div className="font-mono text-xs uppercase tracking-wider font-bold text-purple-deep">
            Host control room
          </div>
          <div className="inline-block mt-2 font-mono text-xs uppercase tracking-wider text-ink bg-sage px-3 py-1 rounded-full font-extrabold border-2 border-ink">
            {phase}
          </div>
        </div>

        {/* Stat blocks */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-1 gap-2.5">
          <div className="bg-white border-2 border-ink rounded-xl p-3.5 shadow-hard-sm">
            <div className="font-display font-black text-2xl text-ink">{submittedCount}</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-ink font-bold">
              Submitted
            </div>
          </div>
          <div className="bg-white border-2 border-ink rounded-xl p-3.5 shadow-hard-sm">
            <div className="font-display font-black text-2xl text-ink">{answeredCount}</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-ink font-bold">
              Answered
            </div>
          </div>
          <div className="bg-white border-2 border-ink rounded-xl p-3.5 shadow-hard-sm">
            <div className="font-display font-black text-2xl text-ink">{remainingCount}</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-ink font-bold">
              Remaining
            </div>
          </div>
          <div className="bg-white border-2 border-ink rounded-xl p-3.5 shadow-hard-sm">
            <div className="font-display font-black text-2xl text-ink">{presence}</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-ink font-bold">
              In Room
            </div>
          </div>
        </div>

        {/* Phase Action Controls */}
        <div className="flex flex-col gap-2.5 mt-1">
          {(phase === 'setup' || phase === 'invited') && (
            <Button variant="primary" fullWidth onClick={openSubmissions}>
              Open submissions
            </Button>
          )}

          {phase === 'submitting' && (
            <Button variant="primary" fullWidth onClick={closeSubmissions}>
              Close submissions
            </Button>
          )}

          {phase === 'closed' && (
            <Button variant="primary" fullWidth onClick={startVoting}>
              Start voting
            </Button>
          )}

          {phase === 'voting' && (
            <Button variant="primary" fullWidth onClick={closeVotingPickWinner}>
              Close voting
            </Button>
          )}

          {phase === 'winner' && (
            <Button variant="primary" fullWidth onClick={moveToAnswering}>
              Move to answering
            </Button>
          )}

          {phase === 'answering' && (
            <Button variant="primary" fullWidth onClick={markAnswered}>
              That's been answered
            </Button>
          )}

          {phase === 'followup' && remainingCount > 0 && (
            <Button variant="gold" fullWidth onClick={nextQuestion}>
              Next question
            </Button>
          )}

          {phase !== 'ended' ? (
            <Button variant="ghost" fullWidth onClick={endSession}>
              End session
            </Button>
          ) : (
            <Button variant="ghost" fullWidth onClick={restartDemo}>
              Start a new session
            </Button>
          )}
        </div>

        <div className="mt-auto pt-4 flex items-center justify-center gap-2 bg-sage-tint text-sage-deep border-2 border-ink py-2 px-3 rounded-full font-mono text-[11px] uppercase tracking-wider font-bold">
          <MicIcon className="w-3.5 h-3.5" />
          <span>Identities hidden</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-bold text-2xl text-ink">Live session</h2>
          <button
            type="button"
            onClick={() => setView('landing')}
            className="font-mono text-xs uppercase tracking-wider font-bold text-ink hover:text-purple-deep cursor-pointer"
          >
            Exit
          </button>
        </div>

        {/* Current Active Question spotlight */}
        {currentQuestion && (phase === 'winner' || phase === 'answering' || phase === 'followup') && (
          <div className="bg-white border-[2.5px] border-purple-deep rounded-2xl p-5 mb-6 shadow-hard-md animate-rise">
            <div className="font-mono text-xs uppercase tracking-wider font-bold text-purple-deep">
              Now answering
            </div>
            <div className="font-display font-bold text-xl text-ink mt-2">
              "{currentQuestion.text}"
            </div>
            <Pill className="mt-3">
              {currentQuestion.votes} votes
            </Pill>
          </div>
        )}

        {/* Question Pool Feed */}
        <div>
          <div className="font-mono text-xs uppercase tracking-wider font-bold text-muted-ink mb-3">
            Question Pool ({questions.length})
          </div>

          <div className="space-y-2.5">
            {questions.length === 0 ? (
              <p className="text-muted-ink text-sm font-semibold py-8 text-center bg-white border-2 border-ink rounded-xl">
                No questions yet. Once you open submissions, they will appear here as employees add them.
              </p>
            ) : (
              questions.map((q) => (
                <div
                  key={q.id}
                  className={`flex items-center gap-3 bg-white border-2 border-ink rounded-xl p-3.5 shadow-hard-sm transition-opacity ${
                    q.answered ? 'opacity-50' : ''
                  }`}
                >
                  <AvatarBlob avatarId={q.avatarId} size="sm" />
                  <div className="flex-1 min-w-0 text-sm font-semibold text-ink leading-snug">
                    <span>{q.text}</span>
                    {q.answered && (
                      <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-muted-ink font-bold">
                        · Answered
                      </span>
                    )}
                  </div>

                  {/* Vote count */}
                  {(phase === 'voting' || phase === 'winner' || phase === 'answering' || phase === 'followup') && !q.answered && (
                    <span className="font-mono font-black text-sm text-purple-deep shrink-0">
                      {q.votes} votes
                    </span>
                  )}

                  {/* Remove Question button */}
                  {!q.answered && (phase === 'submitting' || phase === 'closed') && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(q.id)}
                      title="Remove question"
                      className="w-7 h-7 rounded-lg border-2 border-ink bg-white hover:bg-purple-tint text-ink flex items-center justify-center font-bold text-xs shadow-hard-sm cursor-pointer shrink-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
