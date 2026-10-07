import type { PrismaService } from '../prisma/prisma.service';
import type {
  AttachmentRow,
  BetaRow,
  HubDb,
  MessageRow,
  NoticeRow,
  PrefsRow,
  SubscriptionRow,
  SuggestionRow,
} from './hub-db';
import { defaultNoticePrefs } from './push-delivery';

function asBuffer(value: Uint8Array | Buffer): Buffer {
  return Buffer.isBuffer(value) ? value : Buffer.from(value);
}

export class PrismaHubDb implements HubDb {
  constructor(private readonly prisma: PrismaService) {}

  async getUser(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, email: true },
    });
  }

  async listAdmins() {
    return this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, role: true, email: true },
    });
  }

  async getSubscription(userId: string): Promise<SubscriptionRow | null> {
    const row = await this.prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (!row) return null;
    return {
      userId: row.userId,
      tier: row.tier,
      planId: row.planId,
      status: row.status,
      currentPeriodEnd: row.currentPeriodEnd,
      founderNumber: row.founderNumber,
    };
  }

  async getFoundingClaim(userId: string) {
    const row = await this.prisma.foundingClaim.findFirst({
      where: { userId },
      orderBy: { founderNumber: 'asc' },
    });
    return row ? { founderNumber: row.founderNumber } : null;
  }

  async listFoundingSubscriptions(): Promise<SubscriptionRow[]> {
    const rows = await this.prisma.subscription.findMany({
      where: { OR: [{ tier: 'FoundingPro' }, { planId: 'founding_pro' }] },
    });
    return rows.map((row) => ({
      userId: row.userId,
      tier: row.tier,
      planId: row.planId,
      status: row.status,
      currentPeriodEnd: row.currentPeriodEnd,
      founderNumber: row.founderNumber,
    }));
  }

  async suggestionsSince(userId: string, since: Date) {
    const rows = await this.prisma.founderSuggestion.findMany({
      where: { userId, createdAt: { gte: since } },
    });
    return rows.map(mapSuggestion);
  }

  async insertSuggestion(row: Omit<SuggestionRow, 'id' | 'updatedAt'> & { createdAt: Date }) {
    const saved = await this.prisma.founderSuggestion.create({
      data: {
        userId: row.userId,
        title: row.title,
        description: row.description,
        category: row.category as 'feature_idea',
        status: 'submitted',
        featureKey: row.featureKey,
        contentHash: row.contentHash,
        founderLastReadAt: row.founderLastReadAt,
        ownerLastReadAt: row.ownerLastReadAt,
        createdAt: row.createdAt,
      },
    });
    return mapSuggestion(saved);
  }

  async listSuggestions() {
    const rows = await this.prisma.founderSuggestion.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows.map(mapSuggestion);
  }

  async getSuggestion(id: string) {
    const row = await this.prisma.founderSuggestion.findUnique({ where: { id } });
    return row ? mapSuggestion(row) : null;
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
    const saved = await this.prisma.founderSuggestion.update({
      where: { id },
      data: {
        ...(patch.status
          ? { status: patch.status as 'submitted' }
          : {}),
        ...(patch.founderLastReadAt !== undefined
          ? { founderLastReadAt: patch.founderLastReadAt }
          : {}),
        ...(patch.ownerLastReadAt !== undefined
          ? { ownerLastReadAt: patch.ownerLastReadAt }
          : {}),
      },
    });
    return mapSuggestion(saved);
  }

  async insertMessage(row: Omit<MessageRow, 'id'> & { createdAt?: Date }) {
    const saved = await this.prisma.founderSuggestionMessage.create({
      data: {
        suggestionId: row.suggestionId,
        authorUserId: row.authorUserId,
        kind: row.kind,
        body: row.body,
        createdAt: row.createdAt,
      },
    });
    return mapMessage(saved);
  }

  async messagesFor(suggestionIds: string[]) {
    if (suggestionIds.length === 0) return [];
    const rows = await this.prisma.founderSuggestionMessage.findMany({
      where: { suggestionId: { in: suggestionIds } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(mapMessage);
  }

  async countAttachments(suggestionId: string) {
    return this.prisma.founderSuggestionAttachment.count({
      where: { suggestionId },
    });
  }

  async insertAttachment(row: Omit<AttachmentRow, 'id' | 'createdAt'> & { createdAt: Date }) {
    const saved = await this.prisma.founderSuggestionAttachment.create({
      data: {
        suggestionId: row.suggestionId,
        userId: row.userId,
        fileName: row.fileName,
        mimeType: row.mimeType,
        byteSize: row.byteSize,
        bytes: row.bytes,
        createdAt: row.createdAt,
      },
    });
    return mapAttachment(saved);
  }

  async attachmentsFor(suggestionIds: string[]) {
    if (suggestionIds.length === 0) return [];
    const rows = await this.prisma.founderSuggestionAttachment.findMany({
      where: { suggestionId: { in: suggestionIds } },
      select: {
        id: true,
        suggestionId: true,
        userId: true,
        fileName: true,
        mimeType: true,
        byteSize: true,
        createdAt: true,
      },
    });
    return rows;
  }

  async getAttachment(id: string) {
    const row = await this.prisma.founderSuggestionAttachment.findUnique({
      where: { id },
    });
    return row ? mapAttachment(row) : null;
  }

  async insertNotice(row: Omit<NoticeRow, 'id' | 'createdAt'> & { createdAt: Date }) {
    const saved = await this.prisma.founderNotice.create({
      data: {
        userId: row.userId,
        kind: row.kind as 'founder_message',
        title: row.title,
        body: row.body,
        suggestionId: row.suggestionId,
        featureKey: row.featureKey,
        readAt: row.readAt,
        pushSentAt: row.pushSentAt,
        pushSkipReason: row.pushSkipReason,
        emailSentAt: row.emailSentAt,
        createdAt: row.createdAt,
      },
    });
    return mapNotice(saved);
  }

  async updateNotice(
    id: string,
    patch: Partial<
      Pick<NoticeRow, 'pushSentAt' | 'pushSkipReason' | 'emailSentAt' | 'readAt'>
    >,
  ) {
    await this.prisma.founderNotice.update({ where: { id }, data: patch });
  }

  async listNotices(userId: string) {
    const rows = await this.prisma.founderNotice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map(mapNotice);
  }

  async countUnreadNotices(userId: string, kind?: string) {
    return this.prisma.founderNotice.count({
      where: {
        userId,
        readAt: null,
        ...(kind ? { kind: kind as 'founder_message' } : {}),
      },
    });
  }

  async markNoticesRead(userId: string, suggestionId: string, at: Date) {
    await this.prisma.founderNotice.updateMany({
      where: { userId, suggestionId, readAt: null },
      data: { readAt: at },
    });
  }

  async hasBetaNotice(userId: string, featureKey: string) {
    const row = await this.prisma.founderNotice.findFirst({
      where: { userId, featureKey, kind: 'beta_available' },
      select: { id: true },
    });
    return Boolean(row);
  }

  async getPrefs(userId: string): Promise<PrefsRow> {
    const row = await this.prisma.founderNotificationPreference.findUnique({
      where: { userId },
    });
    if (!row) return defaultNoticePrefs();
    return { inApp: row.inApp, push: row.push, email: row.email };
  }

  async savePrefs(userId: string, prefs: PrefsRow) {
    const row = await this.prisma.founderNotificationPreference.upsert({
      where: { userId },
      create: { userId, ...prefs },
      update: prefs,
    });
    return { inApp: row.inApp, push: row.push, email: row.email };
  }

  async saveDevice(
    userId: string,
    token: string,
    platform: string,
    provider: string,
  ) {
    await this.prisma.devicePushToken.upsert({
      where: { token },
      create: { userId, token, platform, provider },
      update: { userId, platform, provider },
    });
  }

  async listDevices(userId: string) {
    const rows = await this.prisma.devicePushToken.findMany({ where: { userId } });
    return rows.map((row) => ({
      token: row.token,
      platform: row.platform,
      provider: row.provider,
    }));
  }

  async listFeatures(): Promise<BetaRow[]> {
    const rows = await this.prisma.betaFeature.findMany();
    return rows.map(mapFeature);
  }

  async getFeature(key: string) {
    const row = await this.prisma.betaFeature.findUnique({ where: { key } });
    return row ? mapFeature(row) : null;
  }

  async updateFeature(key: string, patch: Partial<Pick<BetaRow, 'enabled' | 'stage'>>) {
    const row = await this.prisma.betaFeature.update({
      where: { key },
      data: {
        ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
        ...(patch.stage ? { stage: patch.stage } : {}),
      },
    });
    return mapFeature(row);
  }

  async listOptOuts(userId: string) {
    const rows = await this.prisma.founderBetaOptOut.findMany({ where: { userId } });
    return rows.map((row) => row.featureKey);
  }

  async setOptOut(userId: string, featureKey: string, on: boolean) {
    if (!on) {
      await this.prisma.founderBetaOptOut.deleteMany({
        where: { userId, featureKey },
      });
      return;
    }
    await this.prisma.founderBetaOptOut.upsert({
      where: { userId_featureKey: { userId, featureKey } },
      create: { userId, featureKey },
      update: {},
    });
  }
}

function mapSuggestion(row: {
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
}): SuggestionRow {
  return { ...row };
}

function mapMessage(row: {
  id: string;
  suggestionId: string;
  authorUserId: string;
  kind: MessageRow['kind'];
  body: string;
  createdAt: Date;
}): MessageRow {
  return { ...row };
}

function mapAttachment(row: {
  id: string;
  suggestionId: string;
  userId: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  bytes: Uint8Array;
  createdAt: Date;
}): AttachmentRow {
  return { ...row, bytes: asBuffer(row.bytes) };
}

function mapNotice(row: NoticeRow): NoticeRow {
  return { ...row };
}

function mapFeature(row: BetaRow): BetaRow {
  return { ...row };
}
