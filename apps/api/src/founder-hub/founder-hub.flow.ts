import { formatFoundingMemberLabel, resolvePlanId } from '@daypilot/lib';
import {
  decideBetaAccess,
  SCHEDULE_BUFFER_INSTRUCTION,
  SCHEDULE_BUFFER_KEY,
  type BetaFeatureRow,
} from './beta-access';
import { founderAccess, foundingPhase } from './founding-access';
import type {
  AttachmentRow,
  HubDb,
  MessageRow,
  NoticeRow,
  SuggestionRow,
  UserRow,
} from './hub-db';
import { resolveHubOwner } from './hub-owner';
import {
  defaultNoticePrefs,
  deliveryPlan,
  type NoticePrefs,
} from './push-delivery';
import {
  CATEGORY_LABELS,
  detectImage,
  founderMessageAlert,
  MAX_ATTACHMENTS,
  pickSuggestionInput,
  safeFileName,
  STATUS_LABELS,
  SUBMISSIONS_PER_HOUR,
  suggestionHash,
  SUGGESTION_STATUSES,
  DUPLICATE_WINDOW_MS,
} from './suggestion-rules';

export class HubError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export type HubActor = { id: string; role: string; email?: string };

type SendResult = { sent: boolean; reason?: string };

export type HubEnv = {
  ownerUserId?: string | null;
  apnsReady: boolean;
  /** Firebase server credentials. Unset means an FCM token is not a delivered push. */
  fcmReady?: boolean;
  resendReady: boolean;
  now?: () => Date;
};

export class FounderHubFlow {
  constructor(
    private readonly db: HubDb,
    private readonly env: HubEnv,
    private readonly channels: {
      push?: (input: {
        token: string;
        title: string;
        body: string;
        suggestionId: string | null;
      }) => Promise<SendResult>;
      email?: (input: {
        to: string;
        title: string;
        body: string;
      }) => Promise<SendResult>;
    } = {},
  ) {}

  private now(): Date {
    return this.env.now?.() ?? new Date();
  }

  private async actor(userId: string): Promise<UserRow> {
    const user = await this.db.getUser(userId);
    if (!user) throw new HubError(401, 'Sign in again.');
    return user;
  }

  private async owner() {
    const admins = await this.db.listAdmins();
    const envUserId = this.env.ownerUserId?.trim() || '';
    const envUser = envUserId ? await this.db.getUser(envUserId) : null;
    return resolveHubOwner({
      admins,
      envUserId: this.env.ownerUserId,
      envUserExists: Boolean(envUser),
    });
  }

  async accountFlags(userId: string): Promise<{
    isOwner: boolean;
    unreadCount: number;
  }> {
    const resolved = await this.owner();
    const isOwner = resolved.userId === userId;
    if (!isOwner || !resolved.userId) {
      return { isOwner: false, unreadCount: 0 };
    }
    const unreadCount = await this.db.countUnreadNotices(
      resolved.userId,
      'founder_message',
    );
    return { isOwner: true, unreadCount };
  }

  private async snapshot(userId: string) {
    const subscription = await this.db.getSubscription(userId);
    const claim = await this.db.getFoundingClaim(userId);
    const phase = foundingPhase(subscription, Boolean(claim), this.now());
    const access = founderAccess(phase);
    const founderNumber =
      phase === 'none'
        ? null
        : (subscription?.founderNumber ?? claim?.founderNumber ?? null);
    const planId = resolvePlanId(subscription?.tier, subscription?.planId);
    return { phase, access, founderNumber, planId, subscription };
  }

  async summary(userId: string) {
    const snap = await this.snapshot(userId);
    const suggestions = (await this.db.listSuggestions()).filter(
      (row) => row.userId === userId,
    );
    const messages = await this.db.messagesFor(
      suggestions.map((row) => row.id),
    );
    const unreadReplyCount = suggestions.filter((row) =>
      this.founderHasUnread(row, messages),
    ).length;
    return {
      phase: snap.phase,
      founderNumber: snap.founderNumber,
      label:
        snap.founderNumber != null
          ? formatFoundingMemberLabel(snap.founderNumber)
          : snap.phase === 'none'
            ? null
            : 'Founding Member',
      canRead: snap.access.canRead,
      canWrite: snap.access.canWrite,
      betaEligible: snap.access.betaEligible,
      unreadReplyCount,
    };
  }

  async submit(actorId: string, body: Record<string, unknown>) {
    const user = await this.actor(actorId);
    const snap = await this.snapshot(user.id);
    if (!snap.access.canWrite) {
      throw new HubError(
        403,
        'Founder Hub is available to active founding members.',
      );
    }
    const input = this.parseInput(body);
    const hash = suggestionHash(input.title, input.description);
    const since = new Date(this.now().getTime() - 60 * 60 * 1000);
    const recent = await this.db.suggestionsSince(user.id, since);
    if (recent.length >= SUBMISSIONS_PER_HOUR) {
      throw new HubError(429, 'Too many suggestions. Try again later.');
    }
    const dupSince = new Date(this.now().getTime() - DUPLICATE_WINDOW_MS);
    const dupes = await this.db.suggestionsSince(user.id, dupSince);
    if (dupes.some((row) => row.contentHash === hash)) {
      throw new HubError(409, 'You already sent this suggestion.');
    }
    const createdAt = this.now();
    const suggestion = await this.db.insertSuggestion({
      userId: user.id,
      title: input.title,
      description: input.description,
      category: input.category,
      status: 'submitted',
      featureKey: input.featureKey,
      contentHash: hash,
      founderLastReadAt: createdAt,
      ownerLastReadAt: null,
      createdAt,
    });
    await this.db.insertMessage({
      suggestionId: suggestion.id,
      authorUserId: user.id,
      kind: 'founder',
      body: input.description,
      createdAt,
    });
    const delivered = await this.notifyOwner(suggestion);
    return {
      suggestion: await this.founderView(suggestion.id, user.id),
      deliveredToOwner: delivered,
    };
  }

  async replyAsFounder(actorId: string, suggestionId: string, text: string) {
    const user = await this.actor(actorId);
    const snap = await this.snapshot(user.id);
    const suggestion = await this.requireSuggestion(suggestionId);
    if (suggestion.userId !== user.id)
      throw new HubError(403, 'Not your suggestion.');
    if (!snap.access.canWrite) {
      throw new HubError(403, 'This conversation is read-only.');
    }
    const body = text.trim();
    if (!body || body.length > 4000) {
      throw new HubError(400, 'Message must be 1–4000 characters.');
    }
    const createdAt = this.now();
    await this.db.insertMessage({
      suggestionId,
      authorUserId: user.id,
      kind: 'founder',
      body,
      createdAt,
    });
    await this.db.updateSuggestion(suggestionId, { updatedAt: createdAt });
    const delivered = await this.notifyOwner({
      ...suggestion,
      title: suggestion.title,
    });
    return {
      suggestion: await this.founderView(suggestionId, user.id),
      deliveredToOwner: delivered,
    };
  }

  async addAttachment(
    actorId: string,
    suggestionId: string,
    input: { fileName: string; mimeType: string; dataBase64: string },
  ) {
    const user = await this.actor(actorId);
    const snap = await this.snapshot(user.id);
    const suggestion = await this.requireSuggestion(suggestionId);
    if (suggestion.userId !== user.id || !snap.access.canWrite) {
      throw new HubError(
        403,
        'You cannot add a screenshot to this suggestion.',
      );
    }
    const count = await this.db.countAttachments(suggestionId);
    if (count >= MAX_ATTACHMENTS) {
      throw new HubError(400, 'Three screenshots is the limit.');
    }
    let bytes: Buffer;
    try {
      bytes = Buffer.from(input.dataBase64, 'base64');
    } catch {
      throw new HubError(400, 'Screenshot could not be read.');
    }
    const image = detectImage(bytes, input.mimeType);
    if (!image) {
      throw new HubError(
        400,
        'Screenshots must be PNG, JPEG, GIF, or WebP and 2 MB or smaller.',
      );
    }
    const row = await this.db.insertAttachment({
      suggestionId,
      userId: user.id,
      fileName: safeFileName(input.fileName),
      mimeType: image.mimeType,
      byteSize: bytes.length,
      bytes,
      createdAt: this.now(),
    });
    return {
      id: row.id,
      fileName: row.fileName,
      mimeType: row.mimeType,
      byteSize: row.byteSize,
    };
  }

  async listMine(actorId: string) {
    const snap = await this.snapshot(actorId);
    if (!snap.access.canRead)
      throw new HubError(403, 'Founder Hub is not on this account.');
    const rows = (await this.db.listSuggestions()).filter(
      (row) => row.userId === actorId,
    );
    return Promise.all(rows.map((row) => this.founderView(row.id, actorId)));
  }

  async readMine(actorId: string, suggestionId: string) {
    const snap = await this.snapshot(actorId);
    const suggestion = await this.requireSuggestion(suggestionId);
    if (suggestion.userId !== actorId) {
      if (!(await this.canModerate(actorId)))
        throw new HubError(403, 'Not your suggestion.');
      return this.adminView(suggestionId);
    }
    if (!snap.access.canRead)
      throw new HubError(403, 'Founder Hub is not on this account.');
    await this.db.updateSuggestion(suggestionId, {
      founderLastReadAt: this.now(),
    });
    return this.founderView(suggestionId, actorId);
  }

  async readAttachment(actorId: string, attachmentId: string) {
    const attachment = await this.db.getAttachment(attachmentId);
    if (!attachment) throw new HubError(404, 'Screenshot not found.');
    const suggestion = await this.requireSuggestion(attachment.suggestionId);
    if (suggestion.userId !== actorId && !(await this.canModerate(actorId))) {
      throw new HubError(403, 'You cannot open this screenshot.');
    }
    if (suggestion.userId === actorId) {
      const snap = await this.snapshot(actorId);
      if (!snap.access.canRead)
        throw new HubError(403, 'You cannot open this screenshot.');
    }
    return {
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      bytes: attachment.bytes,
    };
  }

  async listInbox(
    actorId: string,
    filter: {
      category?: string;
      status?: string;
      q?: string;
      unread?: boolean;
    },
  ) {
    await this.assertAdmin(actorId);
    const rows = await this.db.listSuggestions();
    const messages = await this.db.messagesFor(rows.map((row) => row.id));
    const q = filter.q?.trim().toLowerCase() ?? '';
    const matched = rows.filter((row) => {
      if (filter.category && row.category !== filter.category) return false;
      if (filter.status && row.status !== filter.status) return false;
      if (q && !`${row.title} ${row.description}`.toLowerCase().includes(q)) {
        return false;
      }
      if (filter.unread && !this.ownerHasUnread(row, messages)) return false;
      return true;
    });
    return Promise.all(matched.map((row) => this.adminView(row.id)));
  }

  async readInbox(actorId: string, suggestionId: string) {
    await this.assertAdmin(actorId);
    const at = this.now();
    await this.db.updateSuggestion(suggestionId, { ownerLastReadAt: at });
    const resolved = await this.owner();
    if (resolved.userId) {
      await this.db.markNoticesRead(resolved.userId, suggestionId, at);
    }
    return this.adminView(suggestionId);
  }

  async setInboxRead(actorId: string, suggestionId: string, read: boolean) {
    await this.assertAdmin(actorId);
    const at = read ? this.now() : null;
    await this.db.updateSuggestion(suggestionId, { ownerLastReadAt: at });
    const resolved = await this.owner();
    if (resolved.userId && read) {
      await this.db.markNoticesRead(resolved.userId, suggestionId, this.now());
    }
    return this.adminView(suggestionId);
  }

  async adminReply(actorId: string, suggestionId: string, text: string) {
    const admin = await this.assertAdmin(actorId);
    const suggestion = await this.requireSuggestion(suggestionId);
    const body = text.trim();
    if (!body || body.length > 4000) {
      throw new HubError(400, 'Reply must be 1–4000 characters.');
    }
    const createdAt = this.now();
    await this.db.insertMessage({
      suggestionId,
      authorUserId: admin.id,
      kind: 'admin_reply',
      body,
      createdAt,
    });
    await this.notifyFounder(suggestion, 'admin_reply', {
      title: 'Reply from DayPilot',
      body: `DayPilot replied on “${suggestion.title}”.`,
    });
    return this.adminView(suggestionId);
  }

  async adminNote(actorId: string, suggestionId: string, text: string) {
    const admin = await this.assertAdmin(actorId);
    await this.requireSuggestion(suggestionId);
    const body = text.trim();
    if (!body || body.length > 4000) {
      throw new HubError(400, 'Note must be 1–4000 characters.');
    }
    await this.db.insertMessage({
      suggestionId,
      authorUserId: admin.id,
      kind: 'internal_note',
      body,
      createdAt: this.now(),
    });
    return this.adminView(suggestionId);
  }

  async setStatus(actorId: string, suggestionId: string, status: string) {
    const admin = await this.assertAdmin(actorId);
    if (
      !SUGGESTION_STATUSES.includes(
        status as (typeof SUGGESTION_STATUSES)[number],
      )
    ) {
      throw new HubError(400, 'Unknown status.');
    }
    const suggestion = await this.requireSuggestion(suggestionId);
    const updated = await this.db.updateSuggestion(suggestionId, {
      status,
      updatedAt: this.now(),
    });
    const label = STATUS_LABELS[status] ?? status;
    await this.db.insertMessage({
      suggestionId,
      authorUserId: admin.id,
      kind: 'status_change',
      body: `Status changed to ${label}.`,
      createdAt: this.now(),
    });
    await this.notifyFounder(suggestion, 'status_change', {
      title: 'Suggestion update',
      body: `“${suggestion.title}” is now ${label}.`,
    });
    return this.adminView(updated.id);
  }

  async alerts(actorId: string) {
    const flags = await this.accountFlags(actorId);
    if (!flags.isOwner) throw new HubError(403, 'Not the hub owner.');
    const notices = await this.db.listNotices(actorId);
    return {
      unreadCount: flags.unreadCount,
      alerts: notices
        .filter((row) => row.kind === 'founder_message' && !row.readAt)
        .map((row) => ({
          noticeId: row.id,
          suggestionId: row.suggestionId,
          title: row.title,
          body: row.body,
          createdAt: row.createdAt.toISOString(),
        })),
    };
  }

  async listNotices(actorId: string) {
    const notices = await this.db.listNotices(actorId);
    return notices.map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      body: row.body,
      suggestionId: row.suggestionId,
      featureKey: row.featureKey,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      pushSent: Boolean(row.pushSentAt),
      pushSkipReason: row.pushSkipReason,
    }));
  }

  async markNoticeRead(actorId: string, noticeId: string) {
    const notices = await this.db.listNotices(actorId);
    if (!notices.some((row) => row.id === noticeId)) {
      throw new HubError(404, 'Notification not found.');
    }
    await this.db.updateNotice(noticeId, { readAt: this.now() });
    return { ok: true };
  }

  async getPrefs(actorId: string): Promise<NoticePrefs> {
    return this.db.getPrefs(actorId);
  }

  async savePrefs(actorId: string, patch: Partial<NoticePrefs>) {
    const current = await this.db.getPrefs(actorId);
    return this.db.savePrefs(actorId, {
      inApp: patch.inApp ?? current.inApp,
      push: patch.push ?? current.push,
      email: patch.email ?? current.email,
    });
  }

  async registerDevice(
    actorId: string,
    token: string,
    platform: string,
    provider = 'fcm',
  ) {
    const clean = token.trim();
    if (clean.length < 8 || clean.length > 4096) {
      throw new HubError(400, 'Device token is not valid.');
    }
    if (platform !== 'ios' && platform !== 'android') {
      throw new HubError(400, 'Platform must be ios or android.');
    }
    if (provider !== 'fcm' && provider !== 'apns') {
      throw new HubError(400, 'Token provider must be fcm or apns.');
    }
    await this.db.saveDevice(actorId, clean, platform, provider);
    return { ok: true };
  }

  async betaFor(actorId: string, platform: string, appVersion: string | null) {
    const snap = await this.snapshot(actorId);
    const features = await this.db.listFeatures();
    const optOuts = new Set(await this.db.listOptOuts(actorId));
    const surface = platform === 'ios' ? 'ios' : 'web';
    return features
      .map((feature) => {
        const decision = decideBetaAccess({
          feature,
          phase: snap.phase,
          planId: snap.planId,
          platform: surface,
          appVersion,
          optedOut: optOuts.has(feature.key),
          now: this.now(),
        });
        return { feature, decision };
      })
      .filter((row) => row.decision.visible)
      .map(({ feature, decision }) => ({
        key: feature.key,
        name: feature.name,
        description: feature.description,
        stage: feature.stage,
        label: decision.label,
        apply: decision.apply,
        optedOut: decision.optedOut,
        changesScheduling: feature.changesScheduling,
        access: decision.access,
      }));
  }

  async setOptOut(actorId: string, featureKey: string, on: boolean) {
    const snap = await this.snapshot(actorId);
    if (!snap.access.betaEligible) {
      throw new HubError(403, 'Founder beta is not on this account.');
    }
    const feature = await this.db.getFeature(featureKey);
    if (!feature || !feature.changesScheduling) {
      throw new HubError(404, 'That feature cannot be turned off here.');
    }
    await this.db.setOptOut(actorId, featureKey, on);
    return this.betaFor(actorId, 'web', null);
  }

  async scheduleBufferLine(userId: string): Promise<string | null> {
    const rows = await this.betaFor(userId, 'web', null);
    const buffer = rows.find((row) => row.key === SCHEDULE_BUFFER_KEY);
    if (!buffer?.apply) return null;
    return SCHEDULE_BUFFER_INSTRUCTION;
  }

  async setFeatureEnabled(actorId: string, key: string, enabled: boolean) {
    await this.assertAdmin(actorId);
    const feature = await this.db.getFeature(key);
    if (!feature) throw new HubError(404, 'Feature not found.');
    const updated = await this.db.updateFeature(key, { enabled });
    if (enabled && updated.stage === 'founder_beta') {
      await this.notifyFoundersOfBeta(updated);
    }
    return {
      key: updated.key,
      enabled: updated.enabled,
      stage: updated.stage,
    };
  }

  async listFeatureAdmin(actorId: string) {
    await this.assertAdmin(actorId);
    const features = await this.db.listFeatures();
    return features.map((feature) => ({
      key: feature.key,
      name: feature.name,
      stage: feature.stage,
      enabled: feature.enabled,
      planEntitlement: feature.planEntitlement,
      changesScheduling: feature.changesScheduling,
    }));
  }

  private async notifyFoundersOfBeta(feature: BetaFeatureRow) {
    const subs = await this.db.listFoundingSubscriptions();
    for (const sub of subs) {
      const claim = await this.db.getFoundingClaim(sub.userId);
      const phase = foundingPhase(sub, Boolean(claim), this.now());
      if (phase !== 'active' && phase !== 'grace') continue;
      if (await this.db.hasBetaNotice(sub.userId, feature.key)) continue;
      await this.notifyUser(sub.userId, 'beta_available', {
        title: 'Founder beta',
        body: `${feature.name} is in founder beta.`,
        suggestionId: null,
        featureKey: feature.key,
      });
    }
  }

  private parseInput(body: Record<string, unknown>) {
    try {
      return pickSuggestionInput(body);
    } catch (err) {
      throw new HubError(
        400,
        err instanceof Error ? err.message : 'Invalid suggestion.',
      );
    }
  }

  /** ADMIN, or the user named by FOUNDER_HUB_OWNER_USER_ID. */
  private async canModerate(actorId: string): Promise<boolean> {
    const user = await this.actor(actorId);
    if (user.role === 'ADMIN') return true;
    const resolved = await this.owner();
    return resolved.userId === user.id;
  }

  private async assertAdmin(actorId: string): Promise<UserRow> {
    const user = await this.actor(actorId);
    if (!(await this.canModerate(actorId))) {
      throw new HubError(403, 'Admin only.');
    }
    return user;
  }

  private async requireSuggestion(id: string): Promise<SuggestionRow> {
    const row = await this.db.getSuggestion(id);
    if (!row) throw new HubError(404, 'Suggestion not found.');
    return row;
  }

  private founderHasUnread(
    row: SuggestionRow,
    messages: MessageRow[],
  ): boolean {
    const inbound = messages.filter(
      (message) =>
        message.suggestionId === row.id &&
        (message.kind === 'admin_reply' || message.kind === 'status_change'),
    );
    if (inbound.length === 0) return false;
    const latest = inbound.reduce(
      (max, message) => (message.createdAt > max ? message.createdAt : max),
      inbound[0].createdAt,
    );
    if (!row.founderLastReadAt) return true;
    return latest > row.founderLastReadAt;
  }

  private ownerHasUnread(row: SuggestionRow, messages: MessageRow[]): boolean {
    const inbound = messages.filter(
      (message) =>
        message.suggestionId === row.id && message.kind === 'founder',
    );
    if (inbound.length === 0) return !row.ownerLastReadAt;
    const latest = inbound.reduce(
      (max, message) => (message.createdAt > max ? message.createdAt : max),
      inbound[0].createdAt,
    );
    if (!row.ownerLastReadAt) return true;
    return latest > row.ownerLastReadAt;
  }

  private async founderView(id: string, viewerId: string) {
    const suggestion = await this.requireSuggestion(id);
    if (suggestion.userId !== viewerId)
      throw new HubError(403, 'Not your suggestion.');
    const messages = await this.db.messagesFor([id]);
    const attachments = await this.db.attachmentsFor([id]);
    return this.present(suggestion, messages, attachments, false);
  }

  private async adminView(id: string) {
    const suggestion = await this.requireSuggestion(id);
    const author = await this.db.getUser(suggestion.userId);
    const messages = await this.db.messagesFor([id]);
    const attachments = await this.db.attachmentsFor([id]);
    return {
      ...this.present(suggestion, messages, attachments, true),
      founderUserId: suggestion.userId,
      founderEmail: author?.email ?? null,
      ownerUnread: this.ownerHasUnread(suggestion, messages),
    };
  }

  private present(
    suggestion: SuggestionRow,
    messages: MessageRow[],
    attachments: Omit<AttachmentRow, 'bytes'>[],
    includeInternal: boolean,
  ) {
    const visible = messages
      .filter((message) => message.suggestionId === suggestion.id)
      .filter((message) => includeInternal || message.kind !== 'internal_note')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return {
      id: suggestion.id,
      title: suggestion.title,
      description: suggestion.description,
      category: suggestion.category,
      categoryLabel:
        CATEGORY_LABELS[suggestion.category] ?? suggestion.category,
      status: suggestion.status,
      statusLabel: STATUS_LABELS[suggestion.status] ?? suggestion.status,
      featureKey: suggestion.featureKey,
      createdAt: suggestion.createdAt.toISOString(),
      updatedAt: suggestion.updatedAt.toISOString(),
      unread: this.founderHasUnread(suggestion, messages),
      messages: visible.map((message) => ({
        id: message.id,
        body: message.body,
        kind: message.kind,
        createdAt: message.createdAt.toISOString(),
      })),
      attachments: attachments
        .filter((row) => row.suggestionId === suggestion.id)
        .map((row) => ({
          id: row.id,
          fileName: row.fileName,
          mimeType: row.mimeType,
          byteSize: row.byteSize,
        })),
    };
  }

  private async notifyOwner(suggestion: SuggestionRow): Promise<boolean> {
    const resolved = await this.owner();
    if (!resolved.userId) return false;
    const alert = founderMessageAlert(suggestion.title);
    await this.notifyUser(resolved.userId, 'founder_message', {
      ...alert,
      suggestionId: suggestion.id,
      featureKey: null,
    });
    return true;
  }

  private async notifyFounder(
    suggestion: SuggestionRow,
    kind: 'admin_reply' | 'status_change',
    alert: { title: string; body: string },
  ) {
    await this.notifyUser(suggestion.userId, kind, {
      ...alert,
      suggestionId: suggestion.id,
      featureKey: suggestion.featureKey,
    });
  }

  private async notifyUser(
    userId: string,
    kind: string,
    alert: {
      title: string;
      body: string;
      suggestionId: string | null;
      featureKey: string | null;
    },
  ) {
    const prefs = await this.db
      .getPrefs(userId)
      .catch(() => defaultNoticePrefs());
    const devices = await this.db.listDevices(userId);
    const plan = deliveryPlan({
      kind,
      prefs,
      apnsReady: this.env.apnsReady,
      hasDevice: devices.length > 0,
      resendReady: this.env.resendReady,
    });
    if (!plan.storeInApp) return;
    const apnsDevices = devices.filter((device) => device.provider === 'apns');
    const fcmDevices = devices.filter((device) => device.provider !== 'apns');
    // An FCM registration token is not an APNs device token.
    const canApns =
      prefs.push &&
      apnsDevices.length > 0 &&
      this.env.apnsReady &&
      this.channels.push;
    const canFcm =
      prefs.push && fcmDevices.length > 0 && this.env.fcmReady === true;
    let pushSkip = plan.push.reason ?? null;
    if (!prefs.push) pushSkip = 'opted_out';
    else if (devices.length === 0) pushSkip = 'no_device';
    else if (canApns || canFcm) pushSkip = null;
    else pushSkip = 'credentials_missing';
    const notice = await this.db.insertNotice({
      userId,
      kind,
      title: alert.title,
      body: alert.body,
      suggestionId: alert.suggestionId,
      featureKey: alert.featureKey,
      readAt: null,
      pushSentAt: null,
      pushSkipReason: pushSkip,
      emailSentAt: null,
      createdAt: this.now(),
    });
    if (canApns && this.channels.push) {
      let sent = false;
      for (const device of apnsDevices) {
        const result = await this.channels.push({
          token: device.token,
          title: alert.title,
          body: alert.body,
          suggestionId: alert.suggestionId,
        });
        if (result.sent) sent = true;
      }
      await this.db.updateNotice(notice.id, {
        pushSentAt: sent ? this.now() : null,
        pushSkipReason: sent ? null : 'send_failed',
      });
    }
    if (plan.email.attempt && this.channels.email) {
      const user = await this.db.getUser(userId);
      if (user?.email) {
        const result = await this.channels.email({
          to: user.email,
          title: alert.title,
          body: alert.body,
        });
        if (result.sent) {
          await this.db.updateNotice(notice.id, { emailSentAt: this.now() });
        }
      }
    }
  }
}
