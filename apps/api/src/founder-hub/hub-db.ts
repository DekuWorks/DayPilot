export type UserRow = { id: string; role: string; email: string };

export type SubscriptionRow = {
  userId: string;
  tier: string;
  planId: string | null;
  status: string | null;
  currentPeriodEnd: Date | null;
  founderNumber: number | null;
};

export type SuggestionRow = {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  status: string;
  featureKey: string | null;
  contentHash: string;
  founderLastReadAt: Date | null;
  ownerLastReadAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MessageRow = {
  id: string;
  suggestionId: string;
  authorUserId: string;
  kind: 'founder' | 'admin_reply' | 'internal_note' | 'status_change';
  body: string;
  createdAt: Date;
};

export type AttachmentRow = {
  id: string;
  suggestionId: string;
  userId: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  bytes: Buffer;
  createdAt: Date;
};

export type NoticeRow = {
  id: string;
  userId: string;
  kind: string;
  title: string;
  body: string;
  suggestionId: string | null;
  featureKey: string | null;
  readAt: Date | null;
  createdAt: Date;
  pushSentAt: Date | null;
  pushSkipReason: string | null;
  emailSentAt: Date | null;
};

export type PrefsRow = { inApp: boolean; push: boolean; email: boolean };

export type BetaRow = {
  key: string;
  name: string;
  description: string;
  stage: 'internal_testing' | 'founder_beta' | 'general_availability';
  platforms: string[];
  minimumAppVersion: string | null;
  enabled: boolean;
  founderAvailableAt: Date | null;
  generalAvailableAt: Date | null;
  planEntitlement: string;
  changesScheduling: boolean;
};

export interface HubDb {
  getUser(id: string): Promise<UserRow | null>;
  listAdmins(): Promise<UserRow[]>;
  getSubscription(userId: string): Promise<SubscriptionRow | null>;
  getFoundingClaim(userId: string): Promise<{ founderNumber: number } | null>;
  listFoundingSubscriptions(): Promise<SubscriptionRow[]>;
  suggestionsSince(userId: string, since: Date): Promise<SuggestionRow[]>;
  insertSuggestion(
    row: Omit<SuggestionRow, 'id' | 'createdAt' | 'updatedAt'> & {
      createdAt: Date;
    },
  ): Promise<SuggestionRow>;
  listSuggestions(): Promise<SuggestionRow[]>;
  getSuggestion(id: string): Promise<SuggestionRow | null>;
  updateSuggestion(
    id: string,
    patch: Partial<
      Pick<
        SuggestionRow,
        'status' | 'founderLastReadAt' | 'ownerLastReadAt' | 'updatedAt'
      >
    >,
  ): Promise<SuggestionRow>;
  insertMessage(
    row: Omit<MessageRow, 'id' | 'createdAt'> & { createdAt: Date },
  ): Promise<MessageRow>;
  messagesFor(suggestionIds: string[]): Promise<MessageRow[]>;
  countAttachments(suggestionId: string): Promise<number>;
  insertAttachment(
    row: Omit<AttachmentRow, 'id' | 'createdAt'> & { createdAt: Date },
  ): Promise<AttachmentRow>;
  attachmentsFor(
    suggestionIds: string[],
  ): Promise<Omit<AttachmentRow, 'bytes'>[]>;
  getAttachment(id: string): Promise<AttachmentRow | null>;
  insertNotice(
    row: Omit<NoticeRow, 'id' | 'createdAt'> & { createdAt: Date },
  ): Promise<NoticeRow>;
  updateNotice(
    id: string,
    patch: Partial<
      Pick<
        NoticeRow,
        'pushSentAt' | 'pushSkipReason' | 'emailSentAt' | 'readAt'
      >
    >,
  ): Promise<void>;
  listNotices(userId: string): Promise<NoticeRow[]>;
  countUnreadNotices(userId: string, kind?: string): Promise<number>;
  markNoticesRead(
    userId: string,
    suggestionId: string,
    at: Date,
  ): Promise<void>;
  hasBetaNotice(userId: string, featureKey: string): Promise<boolean>;
  getPrefs(userId: string): Promise<PrefsRow>;
  savePrefs(userId: string, prefs: PrefsRow): Promise<PrefsRow>;
  saveDevice(
    userId: string,
    token: string,
    platform: string,
    provider: string,
  ): Promise<void>;
  listDevices(
    userId: string,
  ): Promise<{ token: string; platform: string; provider: string }[]>;
  listFeatures(): Promise<BetaRow[]>;
  getFeature(key: string): Promise<BetaRow | null>;
  updateFeature(
    key: string,
    patch: Partial<Pick<BetaRow, 'enabled' | 'stage'>>,
  ): Promise<BetaRow>;
  listOptOuts(userId: string): Promise<string[]>;
  setOptOut(userId: string, featureKey: string, on: boolean): Promise<void>;
}
