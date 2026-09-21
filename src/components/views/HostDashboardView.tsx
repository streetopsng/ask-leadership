import { useEffect, useRef, useState } from 'react';
import { useSession } from '../../context/SessionContext';
import { isDemoMode, isFirebaseConfigured } from '../../firebase/config';
import {
  listHostSessionSummaryPage,
  listFirestoreQuestionsForHost,
  type HostSessionPage,
  type HostSessionSummary,
} from '../../firebase/sessionService';
import { buildCsv, buildFollowUpList, downloadCsv } from '../../lib/sessionExport';
import { formatTimestamp } from '../../lib/timestamps';
import type { Question, Session } from '../../types';
import Button from '../common/Button';

type ListStatus = 'loading' | 'ready' | 'error' | 'offline';
type DetailStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Host-only past-session dashboard, scoped to this browser's anonymous
 * identity. Lists totals per session (never question text) with a
 * read-only summary/export panel per session reusing the ticket-09 builders.
 */
export default function HostDashboardView() {
  const { uid, setView, showToast } = useSession();
  const [status, setStatus] = useState<ListStatus>('loading');
  const [summaries, setSummaries] = useState<HostSessionSummary[]>([]);
  const [page, setPage] = useState<HostSessionPage>({ sessions: [], cursor: null, hasMore: false });
  const [loadingMore, setLoadingMore] = useState(false);
  const [revision, setRevision] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailQuestions, setDetailQuestions] = useState<Question[]>([]);
  const [detailStatus, setDetailStatus] = useState<DetailStatus>('idle');
  const detailRequestRef = useRef(0);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      // eslint-disable-next-line react/set-state-in-effect -- intentional offline gate on mount
      setStatus('offline');
      return;
    }
    if (!uid) return;
    let cancelled = false;
    // eslint-disable-next-line react/set-state-in-effect -- intentional loading reset per fetch
    setStatus('loading');
    setSummaries([]);
    setPage({ sessions: [], cursor: null, hasMore: false });
    listHostSessionSummaryPage(uid)
      .then(({ summaries: rows, ...nextPage }) => {
        if (cancelled) return;
        setSummaries(rows);
        setPage(nextPage);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [uid, revision]);

  const loadMore = () => {
    if (!uid || !page.cursor || loadingMore) return;
    setLoadingMore(true);
    listHostSessionSummaryPage(uid, 20, page.cursor)
      .then(({ summaries: rows, ...nextPage }) => {
        setSummaries((current) => [...current, ...rows]);
        setPage(nextPage);
      })
      .catch(() => showToast('Could not load more sessions.'))
      .finally(() => setLoadingMore(false));
  };

  const selected: { session: Session; summary: HostSessionSummary } | null = (() => {
    if (!selectedId) return null;
    const summary = summaries.find((s) => s.session.id === selectedId);
    return summary ? { session: summary.session, summary } : null;
  })();

  const openSummary = (id: string) => {
    if (!uid) return;
    setSelectedId(id);
    setDetailQuestions([]);
    setDetailStatus('loading');
    detailRequestRef.current += 1;
    const request = detailRequestRef.current;
    listFirestoreQuestionsForHost(id, uid)
      .then((qs) => {
        if (detailRequestRef.current !== request) return;
        setDetailQuestions(qs);
        setDetailStatus('ready');
      })
      .catch(() => {
        if (detailRequestRef.current !== request) return;
        setDetailStatus('error');
      });
  };

  const handleDownloadCsv = () => {
    if (!selected) return;
    downloadCsv(`ask-leadership-${selected.session.id}.csv`, buildCsv(detailQuestions));
  };

  const handleCopyFollowUpList = async () => {
    if (!selected) return;
    const list = buildFollowUpList(selected.session.id!, detailQuestions);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(list);
      showToast('Follow-up list copied.');
    } catch {
      showToast('Could not copy the follow-up list.');
    }
  };

  return (
    <div className="min-h-screen bg-cream p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="font-mono text-xs uppercase tracking-wider font-bold text-purple-deep">
              Host dashboard
            </div>
            <h1 className="font-display font-bold text-2xl text-ink">Past sessions</h1>
          </div>
          <button
            type="button"
            onClick={() => setView('hostControl')}
            className="font-mono text-xs uppercase tracking-wider font-bold text-ink hover:text-purple-deep cursor-pointer"
          >
            Back to live session
          </button>
        </div>

        <div className="bg-white border-2 border-ink rounded-xl p-4 shadow-hard-sm mb-6">
          <p className="font-body text-sm font-semibold text-ink leading-snug">
            Sessions you hosted <em>from this browser</em>. Clearing browser data loses this list —
            sessions hosted on other devices never appear here.
          </p>
        </div>

        {selected ? (
          <SessionSummaryPanel
            session={selected.session}
            summary={selected.summary}
            questions={detailQuestions}
            detailStatus={detailStatus}
            onBack={() => setSelectedId(null)}
            onDownloadCsv={handleDownloadCsv}
            onCopyFollowUpList={() => void handleCopyFollowUpList()}
          />
        ) : status === 'loading' ? (
          <p className="text-muted-ink text-sm font-semibold py-8 text-center bg-white border-2 border-ink rounded-xl">
            Loading your sessions…
          </p>
        ) : status === 'offline' ? (
          <div className="bg-white border-2 border-ink rounded-xl p-6 shadow-hard-sm text-center">
            <p className="font-body text-sm font-semibold text-ink leading-snug mb-2">
              Past sessions live in Firestore — turn off demo mode and connect to see sessions you
              hosted from this browser.
            </p>
            {isDemoMode() && (
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted-ink font-bold">
                Demo sessions are never saved
              </p>
            )}
          </div>
        ) : status === 'error' ? (
          <div className="bg-white border-2 border-ink rounded-xl p-6 shadow-hard-sm text-center">
            <p className="font-body text-sm font-semibold text-ink mb-4">
              Could not load your sessions.
            </p>
            <Button size="sm" variant="ghost" onClick={() => setRevision((r) => r + 1)}>
              Try again
            </Button>
          </div>
        ) : summaries.length === 0 ? (
          <p className="text-muted-ink text-sm font-semibold py-8 text-center bg-white border-2 border-ink rounded-xl">
            No past sessions yet. Sessions you end as host will appear here.
          </p>
        ) : (
          <div className="space-y-2.5">
            {summaries.map(({ session, submitted, answered, unanswered }) => {
              return (
                <div
                  key={session.id}
                  className="flex items-center gap-3 bg-white border-2 border-ink rounded-xl p-3.5 shadow-hard-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-black text-sm text-ink">{session.id}</div>
                    <SessionMetaLine session={session} />
                    <div className="text-sm font-semibold text-ink mt-1">
                      {submitted} submitted · {answered} answered · {unanswered} follow-up
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Open summary for ${session.id}`}
                    onClick={() => openSummary(session.id!)}
                  >
                    Summary
                  </Button>
                </div>
              );
            })}
            {page.hasMore && (
              <div className="flex justify-center pt-2">
                <Button size="sm" variant="ghost" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? 'Loading…' : 'Load more sessions'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionMetaLine({ session }: { session: Session }) {
  const created = formatTimestamp(session.createdAt);
  return (
    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-ink font-bold mt-1">
      {session.phase} · round {session.round}
      {created ? ` · ${created}` : ' · date unknown'}
    </div>
  );
}

function SessionSummaryPanel({
  session,
  summary,
  questions,
  detailStatus,
  onBack,
  onDownloadCsv,
  onCopyFollowUpList,
}: {
  session: Session;
  summary: HostSessionSummary;
  questions: Question[];
  detailStatus: DetailStatus;
  onBack: () => void;
  onDownloadCsv: () => void;
  onCopyFollowUpList: () => void;
}) {
  return (
    <div className="bg-white border-[2.5px] border-purple-deep rounded-2xl p-5 shadow-hard-md animate-rise">
      <button
        type="button"
        onClick={onBack}
        className="font-mono text-xs uppercase tracking-wider font-bold text-ink hover:text-purple-deep cursor-pointer mb-4"
      >
        ← Back to sessions
      </button>

      <div className="font-mono text-xs uppercase tracking-wider font-bold text-purple-deep">
        Session summary
      </div>
      <div className="font-display font-bold text-xl text-ink mt-1">{session.id}</div>
      <SessionMetaLine session={session} />

      <div className="flex justify-center gap-3 flex-wrap my-5">
        <div className="bg-cream border-2 border-ink rounded-xl p-3 min-w-[100px] shadow-hard-sm">
          <div className="font-display font-black text-2xl text-purple-deep">{summary.submitted}</div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-ink font-bold mt-1">
            Submitted
          </div>
        </div>
        <div className="bg-cream border-2 border-ink rounded-xl p-3 min-w-[100px] shadow-hard-sm">
          <div className="font-display font-black text-2xl text-purple-deep">{summary.answered}</div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-ink font-bold mt-1">
            Answered live
          </div>
        </div>
        <div className="bg-cream border-2 border-ink rounded-xl p-3 min-w-[100px] shadow-hard-sm">
          <div className="font-display font-black text-2xl text-purple-deep">{summary.unanswered}</div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-ink font-bold mt-1">
            Going to follow-up
          </div>
        </div>
      </div>

      {detailStatus === 'loading' ? (
        <p className="text-muted-ink text-sm font-semibold text-center py-4">
          Loading session questions…
        </p>
      ) : detailStatus === 'error' ? (
        <p className="text-sm font-semibold text-center py-4">
          Could not load this session&apos;s questions.
        </p>
      ) : (
        <div className="border-2 border-ink rounded-xl bg-cream p-4">
          <div className="font-mono text-xs uppercase tracking-wider font-bold text-purple-deep mb-3">
            Session export · {questions.length} questions
          </div>
          <div className="flex justify-center gap-3 flex-wrap">
            <Button size="sm" variant="ghost" onClick={onDownloadCsv}>
              Download session CSV
            </Button>
            <Button size="sm" variant="ghost" onClick={onCopyFollowUpList}>
              Copy follow-up list
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
