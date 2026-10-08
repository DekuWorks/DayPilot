import { CreateSuggestionDto } from './dto/founder-hub.dto';
import { decideBetaAccess } from './beta-access';
import { FounderHubFlow, HubError } from './founder-hub.flow';
import { MemoryHubDb } from './founder-hub.memory';
import { resolveHubOwner } from './hub-owner';
import { deliveryPlan } from './push-delivery';
import { pickSuggestionInput } from './suggestion-rules';
import type { BetaRow } from './hub-db';

const NOW = new Date('2026-10-07T16:00:00.000Z');
const FUTURE = new Date('2026-11-07T16:00:00.000Z');
const PAST = new Date('2026-09-01T16:00:00.000Z');

function pngBytes(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13,
  ]);
}

function bufferFeature(enabled = true): BetaRow {
  return {
    key: 'schedule_buffer',
    name: 'Schedule buffer',
    description: 'Short gap between suggested events.',
    stage: 'founder_beta',
    platforms: ['web', 'ios'],
    minimumAppVersion: null,
    enabled,
    founderAvailableAt: PAST,
    generalAvailableAt: null,
    planEntitlement: 'pro',
    changesScheduling: true,
  };
}

function setup(options?: { apnsReady?: boolean; resendReady?: boolean }) {
  const db = new MemoryHubDb();
  let tick = NOW.getTime();
  const pushes: { token: string; title: string; body: string }[] = [];
  const emails: { to: string; title: string }[] = [];
  const flow = new FounderHubFlow(
    db,
    {
      apnsReady: options?.apnsReady ?? false,
      resendReady: options?.resendReady ?? false,
      now: () => new Date(tick++),
    },
    {
      push: async (input) => {
        pushes.push(input);
        return { sent: true };
      },
      email: async (input) => {
        emails.push(input);
        return { sent: true };
      },
    },
  );
  db.users.push(
    { id: 'admin-1', role: 'ADMIN', email: 'owner@example.com' },
    { id: 'founder-1', role: 'USER', email: 'founder@example.com' },
    { id: 'founder-2', role: 'USER', email: 'other@example.com' },
    { id: 'pro-1', role: 'USER', email: 'pro@example.com' },
    { id: 'org-1', role: 'ORG_ADMIN', email: 'org@example.com' },
  );
  db.subscriptions.push(
    {
      userId: 'founder-1',
      tier: 'FoundingPro',
      planId: 'founding_pro',
      status: 'active',
      currentPeriodEnd: FUTURE,
      founderNumber: 7,
    },
    {
      userId: 'founder-2',
      tier: 'FoundingPro',
      planId: 'founding_pro',
      status: 'active',
      currentPeriodEnd: FUTURE,
      founderNumber: 8,
    },
    {
      userId: 'pro-1',
      tier: 'Pro',
      planId: 'pro',
      status: 'active',
      currentPeriodEnd: FUTURE,
      founderNumber: null,
    },
  );
  db.features.push(bufferFeature());
  return { db, flow, pushes, emails };
}

async function expectStatus(work: Promise<unknown>, status: number) {
  try {
    await work;
    throw new Error(`expected HTTP ${status}`);
  } catch (err) {
    expect(err).toBeInstanceOf(HubError);
    expect((err as HubError).status).toBe(status);
  }
}

describe('founder hub', () => {
  it('resolves the hub owner from the single ADMIN role, not a client email', async () => {
    const { flow } = setup();
    await expect(flow.accountFlags('admin-1')).resolves.toEqual({
      isOwner: true,
      unreadCount: 0,
    });
    await expect(flow.accountFlags('founder-1')).resolves.toEqual({
      isOwner: false,
      unreadCount: 0,
    });
    await expect(flow.accountFlags('org-1')).resolves.toEqual({
      isOwner: false,
      unreadCount: 0,
    });
    expect(
      resolveHubOwner({
        admins: [
          { id: 'admin-1', role: 'ADMIN' },
          { id: 'admin-2', role: 'ADMIN' },
        ],
      }).userId,
    ).toBeNull();
    expect(
      resolveHubOwner({
        admins: [
          { id: 'admin-1', role: 'ADMIN' },
          { id: 'admin-2', role: 'ADMIN' },
        ],
        envUserId: 'admin-2',
      }).userId,
    ).toBe('admin-2');
    expect(
      resolveHubOwner({
        admins: [{ id: 'admin-1', role: 'ADMIN' }],
        envUserId: 'not-an-admin',
      }).userId,
    ).toBeNull();
  });

  it('treats the configured owner as the hub owner when their role is still USER', async () => {
    const db = new MemoryHubDb();
    db.users.push(
      { id: 'owner-user', role: 'USER', email: 'owner@example.com' },
      { id: 'member', role: 'USER', email: 'member@example.com' },
    );
    const flow = new FounderHubFlow(db, {
      ownerUserId: 'owner-user',
      apnsReady: false,
      resendReady: false,
    });
    await expect(flow.accountFlags('owner-user')).resolves.toEqual({
      isOwner: true,
      unreadCount: 0,
    });
    await expect(flow.accountFlags('member')).resolves.toEqual({
      isOwner: false,
      unreadCount: 0,
    });
    await expect(flow.listInbox('owner-user', {})).resolves.toEqual([]);
    await expect(flow.listInbox('member', {})).rejects.toMatchObject({
      status: 403,
    });
    expect(
      resolveHubOwner({
        admins: [],
        envUserId: 'owner-user',
        envUserExists: true,
      }),
    ).toEqual({ userId: 'owner-user', source: 'env' });
    expect(
      resolveHubOwner({
        admins: [],
        envUserId: 'missing',
        envUserExists: false,
      }).userId,
    ).toBeNull();
  });

  it('delivers a new suggestion and a follow-up to the owner immediately', async () => {
    const { db, flow } = setup();
    const created = await flow.submit('founder-1', {
      title: 'Week view density',
      description: 'The week grid is hard to scan.',
      category: 'improvement',
      founderNumber: 1,
      isFounder: true,
      enabled: true,
    });
    expect(created.deliveredToOwner).toBe(true);
    expect(
      created.suggestion.messages.some((m) => m.kind === 'internal_note'),
    ).toBe(false);
    const flags = await flow.accountFlags('admin-1');
    expect(flags).toEqual({ isOwner: true, unreadCount: 1 });
    const alerts = await flow.alerts('admin-1');
    expect(alerts.alerts[0].body).toContain('Week view density');
    expect(alerts.alerts[0].suggestionId).toBe(created.suggestion.id);
    const notice = db.notices[0];
    expect(notice.pushSentAt).toBeNull();
    expect(notice.pushSkipReason).toBe('no_device');

    await flow.replyAsFounder(
      'founder-1',
      created.suggestion.id,
      'One more detail.',
    );
    expect(await flow.accountFlags('admin-1')).toMatchObject({
      unreadCount: 2,
    });
    await expect(flow.alerts('founder-1')).rejects.toMatchObject({
      status: 403,
    });
    await expect(flow.listInbox('founder-1', {})).rejects.toMatchObject({
      status: 403,
    });
    await expect(flow.listInbox('org-1', {})).rejects.toMatchObject({
      status: 403,
    });
  });

  it('lets an admin reply and a status change mark the founder unread, and hides notes', async () => {
    const { flow } = setup();
    const created = await flow.submit('founder-1', {
      title: 'Calendar search',
      description: 'Search should include locations.',
      category: 'feature_idea',
    });
    await flow.readInbox('admin-1', created.suggestion.id);
    expect((await flow.accountFlags('admin-1')).unreadCount).toBe(0);

    await flow.adminReply('admin-1', created.suggestion.id, 'We see this.');
    await flow.adminNote(
      'admin-1',
      created.suggestion.id,
      'Internal: not a promise.',
    );
    const mine = await flow.readMine('founder-1', created.suggestion.id);
    expect(mine.messages.map((m) => m.body)).toContain('We see this.');
    expect(JSON.stringify(mine)).not.toContain('Internal: not a promise.');
    expect((await flow.summary('founder-1')).unreadReplyCount).toBe(0);

    await flow.setStatus('admin-1', created.suggestion.id, 'planned');
    const summary = await flow.summary('founder-1');
    expect(summary.unreadReplyCount).toBe(1);
    const again = await flow.listMine('founder-1');
    expect(again[0].statusLabel).toBe('Planned');
    expect(again[0].unread).toBe(true);
    const admin = await flow.readInbox('admin-1', created.suggestion.id);
    expect(JSON.stringify(admin)).toContain('Internal: not a promise.');
  });

  it('blocks cross-account reads, non-founders, and attachment access', async () => {
    const { flow } = setup();
    const created = await flow.submit('founder-1', {
      title: 'Screenshot bug',
      description: 'The button overlaps the title.',
      category: 'bug',
    });
    const file = await flow.addAttachment('founder-1', created.suggestion.id, {
      fileName: '../shot.png',
      mimeType: 'image/png',
      dataBase64: pngBytes().toString('base64'),
    });
    const own = await flow.readAttachment('founder-1', file.id);
    expect(own.mimeType).toBe('image/png');
    expect(own.fileName).toBe('shot.png');
    await expectStatus(flow.readAttachment('founder-2', file.id), 403);
    const adminFile = await flow.readAttachment('admin-1', file.id);
    expect(adminFile.bytes.length).toBe(pngBytes().length);
    await expectStatus(flow.readMine('founder-2', created.suggestion.id), 403);
    await expectStatus(
      flow.submit('pro-1', {
        title: 'I am not a founder',
        description: 'Please let me in.',
        category: 'other',
        founderNumber: 7,
      }),
      403,
    );
    await expectStatus(
      flow.addAttachment('founder-1', created.suggestion.id, {
        fileName: 'notes.txt',
        mimeType: 'text/plain',
        dataBase64: Buffer.from('hello world!!').toString('base64'),
      }),
      400,
    );
  });

  it('keeps write access while active, canceled-until-period-end, or past_due grace, then read-only', async () => {
    const { db, flow } = setup();
    await flow.submit('founder-1', {
      title: 'Active',
      description: 'Still subscribed.',
      category: 'other',
    });

    db.subscriptions.find((row) => row.userId === 'founder-1')!.status =
      'canceled';
    await flow.replyAsFounder(
      'founder-1',
      (await flow.listMine('founder-1'))[0].id,
      'Renewal is off but the period is open.',
    );

    db.subscriptions.find((row) => row.userId === 'founder-1')!.status =
      'past_due';
    const grace = await flow.summary('founder-1');
    expect(grace.phase).toBe('grace');
    expect(grace.canWrite).toBe(true);
    expect(grace.betaEligible).toBe(true);

    db.subscriptions.find(
      (row) => row.userId === 'founder-1',
    )!.currentPeriodEnd = PAST;
    const expired = await flow.summary('founder-1');
    expect(expired.phase).toBe('expired');
    expect(expired.canWrite).toBe(false);
    expect(expired.betaEligible).toBe(false);
    expect(expired.founderNumber).toBe(7);
    const history = await flow.listMine('founder-1');
    expect(history).toHaveLength(1);
    await expectStatus(
      flow.replyAsFounder('founder-1', history[0].id, 'Too late.'),
      403,
    );
    expect(await flow.betaFor('founder-1', 'ios', '17')).toEqual([]);
  });

  it('gates founder beta without changing the plan, and honours kill switch and opt-out', async () => {
    const { db, flow } = setup();
    db.features.push({
      ...bufferFeature(),
      key: 'team_rooms',
      name: 'Team rooms',
      planEntitlement: 'team',
      changesScheduling: false,
      stage: 'founder_beta',
    });
    const web = await flow.betaFor('founder-1', 'web', null);
    const ios = await flow.betaFor('founder-1', 'ios', '17.0.0');
    expect(web.map((row) => row.key).sort()).toEqual(
      ios.map((row) => row.key).sort(),
    );
    expect(web.find((row) => row.key === 'team_rooms')?.access).toBe('beta');
    expect((await flow.summary('founder-1')).phase).not.toBe('none');
    const sub = db.subscriptions.find((row) => row.userId === 'founder-1');
    expect(sub?.planId).toBe('founding_pro');
    expect(sub?.tier).toBe('FoundingPro');

    expect(await flow.betaFor('pro-1', 'web', null)).toEqual([]);
    expect(await flow.scheduleBufferLine('founder-1')).toContain('10 minutes');
    const opted = await flow.setOptOut('founder-1', 'schedule_buffer', true);
    expect(opted.find((row) => row.key === 'schedule_buffer')).toMatchObject({
      apply: false,
      optedOut: true,
      label: 'Beta',
    });
    expect(await flow.scheduleBufferLine('founder-1')).toBeNull();

    await flow.setFeatureEnabled('admin-1', 'schedule_buffer', false);
    expect(
      (await flow.betaFor('founder-1', 'ios', null)).some(
        (row) => row.key === 'schedule_buffer',
      ),
    ).toBe(false);
    await expectStatus(
      flow.setFeatureEnabled('founder-1', 'schedule_buffer', true),
      403,
    );

    const hidden = decideBetaAccess({
      feature: bufferFeature(false),
      phase: 'active',
      planId: 'founding_pro',
      platform: 'web',
      appVersion: null,
      optedOut: false,
      now: NOW,
    });
    expect(hidden.visible).toBe(false);
  });

  it('rejects duplicate sends, rate limits, and client-supplied founder flags', async () => {
    const { flow } = setup();
    const body = {
      title: 'Same idea',
      description: 'Please add this once.',
      category: 'integration' as const,
      founderNumber: 99,
      badge: 'Founding Member #01',
      enabled: true,
      stage: 'general_availability',
    };
    await flow.submit('founder-1', body);
    await expectStatus(flow.submit('founder-1', body), 409);
    for (let i = 0; i < 4; i += 1) {
      await flow.submit('founder-1', {
        title: `Idea ${i}`,
        description: `Different body ${i}`,
        category: 'other',
      });
    }
    await expectStatus(
      flow.submit('founder-1', {
        title: 'Sixth',
        description: 'Over the hourly limit.',
        category: 'other',
      }),
      429,
    );
    const picked = pickSuggestionInput(body);
    expect(picked).toEqual({
      title: 'Same idea',
      description: 'Please add this once.',
      category: 'integration',
      featureKey: null,
    });
    expect(new CreateSuggestionDto()).not.toHaveProperty('founderNumber');
    expect(new CreateSuggestionDto()).not.toHaveProperty('enabled');
  });

  it('sends a real push only when credentials and a device exist, and does not email by default', async () => {
    const quiet = setup();
    await quiet.flow.registerDevice('admin-1', 'device-token-123', 'ios');
    await quiet.flow.submit('founder-1', {
      title: 'No banner',
      description: 'Credentials are missing.',
      category: 'other',
    });
    expect(quiet.pushes).toHaveLength(0);
    expect(quiet.emails).toHaveLength(0);
    expect(quiet.db.notices[0].pushSkipReason).toBe('credentials_missing');
    expect(quiet.db.notices[0].pushSentAt).toBeNull();

    const live = setup({ apnsReady: true, resendReady: true });
    await live.flow.registerDevice(
      'admin-1',
      'device-token-456',
      'ios',
      'apns',
    );
    await live.flow.submit('founder-1', {
      title: 'With banner',
      description: 'Device is registered.',
      category: 'other',
    });
    expect(live.pushes).toHaveLength(1);
    expect(live.pushes[0].body).toContain('With banner');
    expect(live.db.notices[0].pushSentAt).not.toBeNull();
    expect(live.emails).toHaveLength(0);

    await live.flow.savePrefs('founder-1', { email: true });
    await live.flow.adminReply('admin-1', live.db.suggestions[0].id, 'Noted.');
    expect(live.emails.some((mail) => mail.to === 'founder@example.com')).toBe(
      true,
    );
  });

  it('uses the same authorization for web and mobile callers', async () => {
    const { flow } = setup();
    const denied = flow.submit('pro-1', {
      title: 'From the website',
      description: 'Direct API call.',
      category: 'other',
    });
    await expectStatus(denied, 403);
    await expectStatus(
      flow.submit('pro-1', {
        title: 'From the app',
        description: 'Direct API call from mobile.',
        category: 'bug',
      }),
      403,
    );
    expect(
      deliveryPlan({
        kind: 'founder_message',
        prefs: { inApp: false, push: true, email: true },
        apnsReady: false,
        hasDevice: true,
        resendReady: false,
      }),
    ).toMatchObject({
      storeInApp: true,
      push: { attempt: false, reason: 'credentials_missing' },
      email: { attempt: false, reason: 'not_configured' },
    });
  });
});
