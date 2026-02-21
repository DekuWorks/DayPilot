// ShareLink types for calendar sharing
export type ShareMode = 'readOnly' | 'busyOnly';

export interface ShareLink {
  id: string;
  userId: string;
  token: string; // Unguessable token for public access
  mode: ShareMode;
  createdAt: string;
  revokedAt: string | null;
}
