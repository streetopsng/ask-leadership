import type { Question } from '../types';
import { formatTimestamp } from './timestamps';

/**
 * Host-only session export helpers. Pure builders are unit-testable
 * without React or Firebase; downloadCsv is the only DOM-touching piece.
 */

/**
 * Local submission time as YYYY-MM-DD HH:mm.
 * Prefers the Firestore createdAt, falls back to the demo-mode `ts` epoch.
 */
export function formatSubmissionTime(question: Question): string {
  return formatTimestamp(question.createdAt ?? question.ts);
}

function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * One row per question: text, votes, answered, round answered, avatar id,
 * submission time. Newest-first feed order.
 */
export function buildCsv(questions: Question[]): string {
  const header = ['text', 'votes', 'answered', 'round answered', 'avatar id', 'submission time'];
  const rows = questions.map((q) =>
    [
      csvEscape(q.text || ''),
      csvEscape(String(q.votes ?? 0)),
      csvEscape(q.answered ? 'yes' : 'no'),
      csvEscape(q.answeredRound != null ? String(q.answeredRound) : ''),
      csvEscape(q.avatarId || ''),
      csvEscape(formatSubmissionTime(q)),
    ].join(',')
  );
  return [header.join(','), ...rows].join('\r\n');
}

/**
 * Copyable follow-up list for leadership: a stat line plus the unanswered
 * questions ordered by votes, ready to paste into an email.
 */
export function buildFollowUpList(sessionCode: string, questions: Question[]): string {
  const answered = questions.filter((q) => q.answered).length;
  const followUp = questions.length - answered;
  const unanswered = questions
    .filter((q) => !q.answered)
    .slice()
    .sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));

  const lines = [
    `Q&A session ${sessionCode} — follow-up for leadership`,
    '',
    `Submitted: ${questions.length} | Answered live: ${answered} | Going to follow-up: ${followUp}`,
    '',
  ];

  if (unanswered.length === 0) {
    lines.push('Every question was answered live — nothing to follow up.');
  } else {
    lines.push('Questions for follow-up:', '');
    unanswered.forEach((q, index) => {
      const votes = q.votes ?? 0;
      const suffix = votes > 0 ? ` (${votes} vote${votes === 1 ? '' : 's'})` : '';
      lines.push(`${index + 1}. ${q.text}${suffix}`);
    });
  }

  return lines.join('\n');
}

/**
 * Triggers a browser download of the CSV. Adds a UTF-8 BOM so Excel
 * renders accents correctly.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}