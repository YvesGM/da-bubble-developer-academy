export class ChannelNameTakenError extends Error {
  constructor() {
    super('channel-name-taken');
    this.name = 'ChannelNameTakenError';
  }
}
