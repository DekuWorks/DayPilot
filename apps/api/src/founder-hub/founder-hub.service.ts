import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { sendApnsAlert, sendResendEmail } from './apns-send';
import { FounderHubFlow } from './founder-hub.flow';
import { PrismaHubDb } from './prisma-hub.db';
import { apnsCredentialsReady } from './push-delivery';

@Injectable()
export class FounderHubService {
  private readonly flow: FounderHubFlow;

  constructor(
    prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const apns = {
      keyId: config.get<string>('APNS_KEY_ID'),
      teamId: config.get<string>('APNS_TEAM_ID'),
      bundleId: config.get<string>('APNS_BUNDLE_ID'),
      privateKey: config.get<string>('APNS_PRIVATE_KEY'),
      p8Path: config.get<string>('APNS_P8_PATH'),
      useSandbox: config.get<string>('APNS_USE_SANDBOX') === 'true',
    };
    const resendKey = config.get<string>('RESEND_API_KEY')?.trim() ?? '';
    const from =
      config.get<string>('RESEND_FROM_EMAIL')?.trim() ||
      'DayPilot <hello@daypilot.co>';
    this.flow = new FounderHubFlow(
      new PrismaHubDb(prisma),
      {
        ownerUserId: config.get<string>('FOUNDER_HUB_OWNER_USER_ID'),
        apnsReady: apnsCredentialsReady(apns),
        resendReady: Boolean(resendKey),
      },
      {
        push: (input) => sendApnsAlert(apns, input),
        email: (input) =>
          sendResendEmail({
            apiKey: resendKey,
            from,
            to: input.to,
            title: input.title,
            body: input.body,
          }),
      },
    );
  }

  accountFlags(userId: string) {
    return this.flow.accountFlags(userId).catch((err: unknown) => {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code?: string }).code)
          : '';
      // Migration not applied yet. Do not take down GET /auth/me.
      if (code === 'P2021' || code === 'P2022') {
        return { isOwner: false, unreadCount: 0, isFoundingMember: false };
      }
      throw err;
    });
  }

  summary(userId: string) {
    return this.flow.summary(userId);
  }

  submit(userId: string, body: Record<string, unknown>) {
    return this.flow.submit(userId, body);
  }

  replyAsFounder(userId: string, suggestionId: string, text: string) {
    return this.flow.replyAsFounder(userId, suggestionId, text);
  }

  addAttachment(
    userId: string,
    suggestionId: string,
    input: { fileName: string; mimeType: string; dataBase64: string },
  ) {
    return this.flow.addAttachment(userId, suggestionId, input);
  }

  listMine(userId: string) {
    return this.flow.listMine(userId);
  }

  readMine(userId: string, suggestionId: string) {
    return this.flow.readMine(userId, suggestionId);
  }

  readAttachment(userId: string, attachmentId: string) {
    return this.flow.readAttachment(userId, attachmentId);
  }

  listInbox(
    userId: string,
    filter: {
      category?: string;
      status?: string;
      q?: string;
      unread?: boolean;
    },
  ) {
    return this.flow.listInbox(userId, filter);
  }

  readInbox(userId: string, suggestionId: string) {
    return this.flow.readInbox(userId, suggestionId);
  }

  setInboxRead(userId: string, suggestionId: string, read: boolean) {
    return this.flow.setInboxRead(userId, suggestionId, read);
  }

  adminReply(userId: string, suggestionId: string, text: string) {
    return this.flow.adminReply(userId, suggestionId, text);
  }

  adminNote(userId: string, suggestionId: string, text: string) {
    return this.flow.adminNote(userId, suggestionId, text);
  }

  setStatus(userId: string, suggestionId: string, status: string) {
    return this.flow.setStatus(userId, suggestionId, status);
  }

  alerts(userId: string) {
    return this.flow.alerts(userId);
  }

  listNotices(userId: string) {
    return this.flow.listNotices(userId);
  }

  markNoticeRead(userId: string, noticeId: string) {
    return this.flow.markNoticeRead(userId, noticeId);
  }

  getPrefs(userId: string) {
    return this.flow.getPrefs(userId);
  }

  savePrefs(
    userId: string,
    patch: Partial<{ inApp: boolean; push: boolean; email: boolean }>,
  ) {
    return this.flow.savePrefs(userId, patch);
  }

  registerDevice(
    userId: string,
    token: string,
    platform: string,
    provider = 'fcm',
  ) {
    return this.flow.registerDevice(userId, token, platform, provider);
  }

  betaFor(userId: string, platform: string, appVersion: string | null) {
    return this.flow.betaFor(userId, platform, appVersion);
  }

  setOptOut(userId: string, featureKey: string, on: boolean) {
    return this.flow.setOptOut(userId, featureKey, on);
  }

  scheduleBufferLine(userId: string) {
    return this.flow.scheduleBufferLine(userId).catch(() => null);
  }

  setFeatureEnabled(userId: string, key: string, enabled: boolean) {
    return this.flow.setFeatureEnabled(userId, key, enabled);
  }

  listFeatureAdmin(userId: string) {
    return this.flow.listFeatureAdmin(userId);
  }
}
