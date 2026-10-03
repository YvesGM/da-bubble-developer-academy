export interface Channel {
  id: string;
  name: string;
  normalizedName: string;
  nameKey: string;
  description: string;
  creatorId: string;
  memberIds: string[];
  guestAccess: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CreateChannelInput {
  name: string;
  description: string;
  memberIds: string[];
  guestAccess: boolean;
}

export interface UpdateChannelInput {
  name: string;
  description: string;
}
