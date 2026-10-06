/**
 * Signals that a normalized channel name is already reserved.
 *
 * The error is raised from channel-creation or channel-renaming transactions
 * when the channel-name registry already contains the requested normalized key.
 */
export class ChannelNameTakenError extends Error {
  /**
   * Creates the domain-specific duplicate-channel-name error.
   */
  constructor() {
    super('channel-name-taken');
    this.name = 'ChannelNameTakenError';
  }
}
