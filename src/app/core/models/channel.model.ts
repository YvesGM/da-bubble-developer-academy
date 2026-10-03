export interface Channel {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  memberIds: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}
