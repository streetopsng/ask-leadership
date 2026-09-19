import React, { useState } from 'react';
import { useSession } from '../../context/SessionContext';
import Button from '../common/Button';
import AvatarBlob from '../common/AvatarBlob';
import Waveform from '../common/Waveform';
import StageFrame from '../common/StageFrame';
import { Pill } from '../common/Pill';

export default function RoomView() {
  const {
    session,
    me,
    questions,
    submittedCount,
    answeredCount,
    remainingCount,
    activePool,
    currentQuestion,
    submitQuestion,
    voteQuestion,
  } = useSession();

  const { phase, presence, round } = session;
  const mode = session?.config?.mode;
  const [questionInput, setQuestionInput] = useState('');

  const handleAskSubmit = (e) => {
    e.preventDefault();
    submitQuestion(questionInput);
    setQuestionInput('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      {/* Room Header */}
      <header className="px-6 py-4 border-b-[2.5px] border-ink bg-white flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <AvatarBlob avatarId={me.avatar} size="md" />
          <div className="font-display font-bold text-xl text-ink">Ask Leadership</div>
        </div>

        <div className="flex items-center gap-2.5 font-mono text-xs text-muted-ink font-bold">
          <Waveform count={4} variant="sage" />
          <span>{presence} people are in the room</span>
        </div>
      </header>

      {/* Progress Strip (if voting/active) */}
      {submittedCount > 0 && phase !== 'submitting' && (
        <div className="flex items-center justify-center gap-3 px-6 py-3 bg-cream-2 border-b-2 border-ink flex-wrap text-center">
          <span className="font-mono text-xs text-ink tracking-wider font-bold bg-white border-2 border-ink rounded-full px-4 py-1.5 shadow-hard-sm">
            QUESTION <b className="text-purple-deep">{round}</b> OF {answeredCount + remainingCount}
          </span>
          <span className="font-mono text-xs text-ink tracking-wider font-bold bg-white border-2 border-ink rounded-full px-4 py-1.5 shadow-hard-sm">
            {answeredCount} ANSWERED · {remainingCount} REMAINING
          </span>
        </div>
      )}

      {/* View Body Based on Phase */}
      <main className="flex-1 p-6 sm:p-8">
        {/* PHASE: SUBMITTING */}
        {(phase === 'setup' || phase === 'invited' || phase === 'submitting') && (
          <div className="max-w-3xl mx-auto">
            <div className="text-center max-w-xl mx-auto mb-8 animate-rise">
              <div className="font-mono text-xs uppercase tracking-wider font-bold text-purple-deep mb-2">
                Submissions are open
              </div>
              <h2 className="font-display font-bold text-3xl sm:text-4xl text-ink leading-tight">
                What's the question you've always wanted to ask?
              </h2>

              {me.myQuestionId ? (
                <div className="mt-6 bg-sage-tint border-[2.5px] border-ink rounded-2xl p-6 shadow-hard-md animate-rise text-center">
                  <div className="font-mono text-xs uppercase tracking-wider font-bold text-sage-deep mb-1">
                    You just added your voice.
                  </div>
                  <p className="font-body font-semibold text-ink text-sm sm:text-base">
                    Your question is in the room. Sit tight while others add theirs.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleAskSubmit} className="mt-6 text-left">
                  <textarea
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    placeholder="Ask leadership anything..."
                    maxLength={240}
                    rows={3}
                    className="w-full bg-white border-[2.5px] border-ink text-ink rounded-2xl p-4 text-base sm:text-lg font-semibold shadow-hard-md focus:outline-none focus:ring-2 focus:ring-purple-deep resize-y placeholder:text-muted-2"
                  />
                  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 mt-3">
                    <span className="font-mono text-xs text-muted-ink order-2 sm:order-1 text-right sm:text-left">
                      {240 - questionInput.length} characters left
                    </span>
                    <Button type="submit" variant="primary" className="order-1 sm:order-2 w-full sm:w-auto">
                      Ask anonymously
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {/* Questions Feed */}
            <div className="text-center font-mono text-xs tracking-wider text-sage-deep uppercase font-bold mb-4">
              {submittedCount} question{submittedCount === 1 ? '' : 's'} in the room
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {questions.length === 0 ? (
                <p className="col-span-full text-center text-muted-ink font-semibold py-8">
                  The room is listening. Questions will start appearing here.
                </p>
              ) : (
                questions.map((q) => (
                  <div
                    key={q.id}
                    className={`bg-white text-ink border-2 border-ink rounded-2xl p-4 flex flex-col gap-3 shadow-hard-sm animate-rise ${
                      q.mine ? 'border-purple-deep shadow-hard-purple' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <AvatarBlob avatarId={q.avatarId} size="sm" />
                      <span className="font-mono text-[10px] uppercase tracking-wider text-purple-deep font-bold">
                        {q.mine ? 'You' : 'Anonymous'}
                      </span>
                    </div>
                    <div className="text-sm sm:text-base font-bold text-ink leading-snug flex-1">
                      "{q.text}"
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* PHASE: CLOSED */}
        {phase === 'closed' && (
          <div className="max-w-3xl mx-auto text-center">
            <div className="mb-8 animate-rise">
              <div className="font-mono text-xs uppercase tracking-wider font-bold text-purple-deep mb-2">
                The questions are in.
              </div>
              <h2 className="font-display font-bold text-3xl sm:text-4xl text-ink leading-tight">
                Now let's decide what gets answered first.
              </h2>
              <p className="font-body font-semibold text-muted-ink text-base mt-2">
                Voting opens as soon as leadership is ready.
              </p>
            </div>

            <div className="font-mono text-xs tracking-wider text-sage-deep uppercase font-bold mb-4">
              {submittedCount} questions in the room
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className={`bg-white text-ink border-2 border-ink rounded-2xl p-4 flex flex-col gap-3 shadow-hard-sm text-left ${
                    q.mine ? 'border-purple-deep shadow-hard-purple' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <AvatarBlob avatarId={q.avatarId} size="sm" />
                    <span className="font-mono text-[10px] uppercase tracking-wider text-purple-deep font-bold">
                      {q.mine ? 'You' : 'Anonymous'}
                    </span>
                  </div>
                  <div className="text-sm sm:text-base font-bold text-ink leading-snug flex-1">
                    "{q.text}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PHASE: VOTING */}
        {phase === 'voting' && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8 animate-rise">
              <div className="font-mono text-xs uppercase tracking-wider font-bold text-purple-deep mb-2">
                Round {round}
              </div>
              <h2 className="font-display font-bold text-3xl sm:text-4xl text-ink leading-tight">
                What should leadership answer next?
              </h2>
              <p className="font-body font-semibold text-muted-ink text-base mt-2">
                {me.votedThisRound
                  ? "You're helping choose what gets answered next."
                  : 'One vote per round. Choose the question you most want answered.'}
              </p>
            </div>

            <div className="space-y-3.5">
              {activePool.map((q) => {
                const isMine = q.mine;
                const votedThis = me.justVotedId === q.id;
                const disabled = isMine || me.votedThisRound;

                return (
                  <div
                    key={q.id}
                    className={`bg-white text-ink border-[2.5px] border-ink rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-hard-sm transition-all ${
                      votedThis ? 'border-purple-deep shadow-hard-purple animate-bump' : ''
                    } ${isMine ? 'bg-cream-2' : ''}`}
                  >
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <AvatarBlob avatarId={q.avatarId} size="lg" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm sm:text-base font-bold text-ink leading-snug mb-1">
                          "{q.text}"
                        </div>
                        <div className="font-mono text-xs text-purple-deep font-bold">
                          {q.votes} people want this answered
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-line sm:border-0 shrink-0">
                      <div className="font-mono font-black text-lg sm:text-xl text-ink min-w-[32px] text-left sm:text-center">
                        {q.votes} votes
                      </div>

                      {isMine ? (
                        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-2 font-bold px-2">
                          Your question
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => voteQuestion(q.id)}
                          className={`rounded-full border-[2.5px] border-ink px-4 sm:px-5 py-2 sm:py-2.5 font-bold font-body text-xs sm:text-sm tracking-wider cursor-pointer shadow-hard-sm transition-all whitespace-nowrap ${
                            votedThis
                              ? 'bg-gold text-ink'
                              : 'bg-brand-purple text-ink hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-md active:translate-x-0.5 active:translate-y-0.5'
                          } disabled:bg-cream-2 disabled:text-muted-2 disabled:border-line-strong disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none`}
                        >
                          {votedThis ? 'Voted' : 'Vote'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PHASE: WINNER */}
        {phase === 'winner' && (
          <div className="py-12 text-center animate-rise">
            <StageFrame>
              <div className="flex justify-center mb-6">
                <Waveform count={9} variant="gold" size="lg" />
              </div>
              <div className="font-mono text-xs uppercase tracking-wider font-bold text-purple-deep mb-3">
                The room chose
              </div>
              <div className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-ink leading-tight max-w-xl mx-auto mb-4">
                "{currentQuestion?.text}"
              </div>
              <div className="font-mono text-sm uppercase tracking-wider font-bold text-purple-deep mb-6">
                {currentQuestion?.votes} people wanted this answered.
              </div>
              <h2 className="font-display font-black text-2xl sm:text-3xl text-purple-deep uppercase tracking-tight">
                Leadership, you're up.
              </h2>
            </StageFrame>
          </div>
        )}

        {/* PHASE: ANSWERING */}
        {phase === 'answering' && (
          <div className="py-12 text-center animate-rise">
            <StageFrame>
              <div className="inline-flex items-center gap-2 mb-4 font-mono text-xs uppercase tracking-wider font-bold text-purple-deep">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-purple border-2 border-ink animate-pulse-dot" />
                <span>Now answering</span>
              </div>
              <div className="font-display font-bold text-2xl sm:text-4xl text-ink leading-snug max-w-xl mx-auto mb-4">
                "{currentQuestion?.text}"
              </div>
              <div className="mb-6">
                <Pill>{currentQuestion?.votes || 0} votes</Pill>
              </div>
              <div className="flex justify-center mb-5">
                <Waveform count={7} variant="voice" />
              </div>
              <p className="font-body font-semibold text-muted-ink text-base">
                Leadership is answering live {mode === 'virtual' ? 'on the call' : 'in the room'}.
              </p>
            </StageFrame>
          </div>
        )}

        {/* PHASE: FOLLOWUP */}
        {phase === 'followup' && (
          <div className="py-12 text-center animate-rise">
            {remainingCount > 0 ? (
              <StageFrame>
                <div className="font-mono text-xs uppercase tracking-wider font-bold text-sage-deep mb-2">
                  That's been answered.
                </div>
                <h2 className="font-display font-black text-3xl sm:text-4xl text-ink uppercase tracking-tight mb-3">
                  Anything to add?
                </h2>
                <p className="font-body font-semibold text-muted-ink text-base max-w-md mx-auto mb-6">
                  {mode === 'virtual'
                    ? "Use your meeting platform's raise-hand function if you'd like to follow up."
                    : "Raise your hand in the room if you'd like to follow up."}
                </p>
                <Pill>Waiting for the host to move to the next question</Pill>
              </StageFrame>
            ) : (
              <StageFrame>
                <div className="flex justify-center mb-4">
                  <Waveform count={6} variant="sage" />
                </div>
                <h2 className="font-display font-black text-3xl sm:text-4xl text-ink uppercase tracking-tight mb-3">
                  All caught up.
                </h2>
                <p className="font-body font-semibold text-muted-ink text-base max-w-md mx-auto">
                  Every question has an answer or is on its way to one. The host will close the session shortly.
                </p>
              </StageFrame>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
