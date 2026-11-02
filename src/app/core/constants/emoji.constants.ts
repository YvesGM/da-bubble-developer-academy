/**
 * Initial quick-reaction choices shown until a user has saved recent emojis.
 *
 * This is UI fallback state, not the full set of supported reactions.
 */
export const DEFAULT_RECENT_EMOJIS = ['✅', '👍'] as const;

/**
 * Emoji palette shared by the message composer and reaction controls.
 *
 * Display order is intentional; recent user choices are prepended separately
 * by the emoji picker without changing this default catalog.
 */
export const EMOJI_OPTIONS = [
  '👍',
  '❤️',
  '😂',
  '🎉',
  '😮',
  '😢',
  '🔥',
  '👏',
  '✅',
  '🚀',
  '👀',
  '🙏',
] as const;
