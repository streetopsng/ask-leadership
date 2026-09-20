/**
 * Coercion helpers for Firestore Timestamp-like values, Date objects,
 * epoch millis, and ISO strings. Pure and unit-testable.
 */

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toDate(value: unknown): Date | null {
  let candidate: Date | null = null;

  if (value instanceof Date) {
    candidate = value;
  } else if (typeof value === 'number' || typeof value === 'string') {
    candidate = new Date(value);
  } else if (value != null) {
    // Firestore Timestamp-like objects expose toDate() (and toMillis()).
    const maybe = value as { toDate?: unknown; toMillis?: unknown };
    if (typeof maybe.toDate === 'function') {
      candidate = (maybe.toDate as () => Date)();
    } else if (typeof maybe.toMillis === 'function') {
      candidate = new Date((maybe.toMillis as () => number)());
    }
  }

  return candidate && !Number.isNaN(candidate.getTime()) ? candidate : null;
}

/** Epoch millis, or 0 when the value carries no usable time. */
export function timestampMillis(value: unknown): number {
  const d = toDate(value);
  return d ? d.getTime() : 0;
}

/** Local `YYYY-MM-DD HH:mm`, or '' when the value carries no usable time. */
export function formatTimestamp(value: unknown): string {
  const d = toDate(value);
  if (!d) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}