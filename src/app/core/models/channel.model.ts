export interface Channel {
  id: string;
  name: string;
  normalizedName: string;
  description: string;
  creatorId: string;
  memberIds: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CreateChannelInput {
  name: string;
  description: string;
  memberIds: string[];
}

export interface UpdateChannelInput {
  name: string;
  description: string;
}
