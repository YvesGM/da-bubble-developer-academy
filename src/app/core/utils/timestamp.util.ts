/**
 * Normalizes supported timestamp-like values to a native `Date`.
 *
 * Firestore timestamps exposing `toDate()`, serialized timestamps exposing a
 * numeric `seconds` field and native `Date` instances are supported.
 *
 * @param value Timestamp-like value to normalize.
 * @returns Native `Date`, or `null` when the value is unsupported.
 */
export function timestampToDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { toDate?: () => Date; seconds?: number };
  if (typeof candidate.toDate === 'function') return candidate.toDate();
  if (typeof candidate.seconds === 'number') return new Date(candidate.seconds * 1000);
  return null;
}

/**
 * Formats a message timestamp using the German hour/minute representation.
 *
 * @param value Timestamp-like value associated with a message.
 * @returns Formatted local time, or an empty string when the timestamp is invalid.
 */
export function messageTime(value: unknown): string {
  const date = timestampToDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Builds the human-readable date label used between message groups.
 *
 * Today's date is rendered as `Heute`; older dates use the German weekday,
 * day and month representation.
 *
 * @param value Timestamp-like value of the message group.
 * @returns Date label for the UI, or an empty string for invalid timestamps.
 */
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

/**
 * Compares two timestamp-like values by calendar day.
 *
 * @param first First timestamp-like value.
 * @param second Second timestamp-like value.
 * @returns `true` when both values are valid and resolve to the same day.
 */
export function sameMessageDay(first: unknown, second: unknown): boolean {
  const firstDate = timestampToDate(first);
  const secondDate = timestampToDate(second);
  if (!firstDate || !secondDate) return false;
  return sameDay(firstDate, secondDate);
}

/**
 * Compares two dates by calendar day.
 *
 * @param first - First date.
 * @param second - Second date.
 * @returns Whether both dates share the same year, month and day.
 */
/**
 * Compares two native dates by year, month and day.
 *
 * @param first First date to compare.
 * @param second Second date to compare.
 * @returns `true` when both dates represent the same calendar day.
 */
function sameDay(first: Date, second: Date): boolean {
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
}
