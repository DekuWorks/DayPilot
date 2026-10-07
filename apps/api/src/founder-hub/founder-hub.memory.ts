import { randomUUID } from 'node:crypto';
import type {
  AttachmentRow,
  BetaRow,
  HubDb,
  MessageRow,
  NoticeRow,
  PrefsRow,
  SubscriptionRow,
  SuggestionRow,
  UserRow,
} from './hub-db';
import { defaultNoticePrefs } from './push-delivery';

export class MemoryHubDb implements HubDb {
  users: UserRow[] = [];
  subscriptions: SubscriptionRow[] = [];
  claims: { userId: string; founderNumber: number }[] = [];
  suggestions: SuggestionRow[] = [];
  messages: MessageRow[] = [];
  attachments: AttachmentRow[] = [];
  notices: NoticeRow[] = [];
  prefs = new Map<string, PrefsRow>();
  devices: {
    userId: string;
    token: string;
    platform: string;
    provider: string;
  }[] = [];
  features: BetaRow[] = [];
  optOuts: { userId: string; featureKey: string }[] = [];

  async getUser(id: string) {
    return this.users.find((row) => row.id === id) ?? null;
  }

  async listAdmins() {
    return this.users.filter((row) => row.role === 'ADMIN');
  }

  async getSubscription(userId: string) {
    return this.subscriptions.find((row) => row.userId === userId) ?? null;
  }

  async getFoundingClaim(userId: string) {
    return this.claims.find((row) => row.userId === userId) ?? null;
  }

  async listFoundingSubscriptions() {
    return this.subscriptions.filter(
      (row) => row.tier === 'FoundingPro' || row.planId === 'founding_pro',
    );
  }

  async suggestionsSince(userId: string, since: Date) {
    return this.suggestions.filter(
      (row) => row.userId === userId && row.createdAt >= since,
    );
  }

  async insertSuggestion(
    row: Omit<SuggestionRow, 'id' | 'createdAt' | 'updatedAt'> & {
      createdAt: Date;
    },
  ) {
    const saved: SuggestionRow = {
      ...row,
      id: randomUUID(),
      createdAt: row.createdAt,
      updatedAt: row.createdAt,
    };
    this.suggestions.push(saved);
    return saved;
  }

  async listSuggestions() {
    return [...this.suggestions];
  }

  async getSuggestion(id: string) {
    return this.suggestions.find((row) => row.id === id) ?? null;
  }

  async updateSuggestion(
    id: string,
    patch: Partial<
      Pick<
        SuggestionRow,
        'status' | 'founderLastReadAt' | 'ownerLastReadAt' | 'updatedAt'
      >
    >,
  ) {
    const row = await this.getSuggestion(id);
    if (!row) throw new Error('missing suggestion');
    Object.assign(row, patch, {
      updatedAt: patch.updatedAt ?? new Date(),
    });
    return row;
  }

  async insertMessage(
    row: Omit<MessageRow, 'id' | 'createdAt'> & { createdAt: Date },
  ) {
    const saved: MessageRow = { ...row, id: randomUUID() };
    this.messages.push(saved);
    return saved;
  }

  async messagesFor(suggestionIds: string[]) {
    const ids = new Set(suggestionIds);
    return this.messages.filter((row) => ids.has(row.suggestionId));
  }

  async countAttachments(suggestionId: string) {
    return this.attachments.filter((row) => row.suggestionId === suggestionId)
      .length;
  }

  async insertAttachment(
    row: Omit<AttachmentRow, 'id' | 'createdAt'> & { createdAt: Date },
  ) {
    const saved: AttachmentRow = { ...row, id: randomUUID() };
    this.attachments.push(saved);
    return saved;
  }

  async attachmentsFor(suggestionIds: string[]) {
    const ids = new Set(suggestionIds);
    return this.attachments
      .filter((row) => ids.has(row.suggestionId))
      .map(({ bytes: _bytes, ...meta }) => meta);
  }

  async getAttachment(id: string) {
    return this.attachments.find((row) => row.id === id) ?? null;
  }

  async insertNotice(
    row: Omit<NoticeRow, 'id' | 'createdAt'> & { createdAt: Date },
  ) {
    const saved: NoticeRow = { ...row, id: randomUUID() };
    this.notices.push(saved);
    return saved;
  }

  async updateNotice(
    id: string,
    patch: Partial<
      Pick<
        NoticeRow,
        'pushSentAt' | 'pushSkipReason' | 'emailSentAt' | 'readAt'
      >
    >,
  ) {
    const row = this.notices.find((notice) => notice.id === id);
    if (row) Object.assign(row, patch);
  }

  async listNotices(userId: string) {
    return this.notices.filter((row) => row.userId === userId);
  }

  async countUnreadNotices(userId: string, kind?: string) {
    return this.notices.filter(
      (row) =>
        row.userId === userId &&
        !row.readAt &&
        (kind == null || row.kind === kind),
    ).length;
  }

  async markNoticesRead(userId: string, suggestionId: string, at: Date) {
    for (const row of this.notices) {
      if (row.userId === userId && row.suggestionId === suggestionId) {
        row.readAt = at;
      }
    }
  }

  async hasBetaNotice(userId: string, featureKey: string) {
    return this.notices.some(
      (row) =>
        row.userId === userId &&
        row.kind === 'beta_available' &&
        row.featureKey === featureKey,
    );
  }

  async getPrefs(userId: string) {
    return this.prefs.get(userId) ?? defaultNoticePrefs();
  }

  async savePrefs(userId: string, prefs: PrefsRow) {
    this.prefs.set(userId, prefs);
    return prefs;
  }

  async saveDevice(
    userId: string,
    token: string,
    platform: string,
    provider: string,
  ) {
    this.devices = this.devices.filter((row) => row.token !== token);
    this.devices.push({ userId, token, platform, provider });
  }

  async listDevices(userId: string) {
    return this.devices.filter((row) => row.userId === userId);
  }

  async listFeatures() {
    return [...this.features];
  }

  async getFeature(key: string) {
    return this.features.find((row) => row.key === key) ?? null;
  }

  async updateFeature(
    key: string,
    patch: Partial<Pick<BetaRow, 'enabled' | 'stage'>>,
  ) {
    const row = await this.getFeature(key);
    if (!row) throw new Error('missing feature');
    Object.assign(row, patch);
    return row;
  }

  async listOptOuts(userId: string) {
    return this.optOuts
      .filter((row) => row.userId === userId)
      .map((row) => row.featureKey);
  }

  async setOptOut(userId: string, featureKey: string, on: boolean) {
    this.optOuts = this.optOuts.filter(
      (row) => !(row.userId === userId && row.featureKey === featureKey),
    );
    if (on) this.optOuts.push({ userId, featureKey });
  }
}
