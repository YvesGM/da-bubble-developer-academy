/** Converts Firestore-style timestamps and Date values into a Date. */
export function timestampToDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { toDate?: () => Date; seconds?: number };
  if (typeof candidate.toDate === 'function') return candidate.toDate();
  if (typeof candidate.seconds === 'number') return new Date(candidate.seconds * 1000);
  return null;
}

/** Formats a message timestamp as a German local time. */
export function messageTime(value: unknown): string {
  const date = timestampToDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** Formats a message date separator, using "Heute" for the current day. */
export function messageDateLabel(value: unknown): string {
  const date = timestampToDate(value);
  if (!date) return '';
  if (sameDay(date, new Date())) return 'Heute';
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

/** Reports whether two timestamp-like values fall on the same calendar day. */
export function sameMessageDay(first: unknown, second: unknown): boolean {
  const firstDate = timestampToDate(first);
  const secondDate = timestampToDate(second);
  if (!firstDate || !secondDate) return false;
  return sameDay(firstDate, secondDate);
}

function sameDay(first: Date, second: Date): boolean {
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
}
