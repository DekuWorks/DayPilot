import { readFileSync } from 'node:fs';
import http2 from 'node:http2';
import jwt from 'jsonwebtoken';
import { apnsCredentialsReady } from './push-delivery';

export type ApnsConfig = {
  keyId?: string | null;
  teamId?: string | null;
  bundleId?: string | null;
  privateKey?: string | null;
  p8Path?: string | null;
  useSandbox?: boolean;
};

function privateKeyFrom(config: ApnsConfig): string | null {
  const inline = config.privateKey?.trim();
  if (inline) return inline.replace(/\\n/g, '\n');
  const path = config.p8Path?.trim();
  if (!path) return null;
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Sends one alert through APNs. Returns sent:false when Apple rejects it.
 * Never treats a missing key as success.
 */
export async function sendApnsAlert(
  config: ApnsConfig,
  input: {
    token: string;
    title: string;
    body: string;
    suggestionId: string | null;
  },
): Promise<{ sent: boolean; reason?: string }> {
  const privateKey = privateKeyFrom(config);
  if (
    !apnsCredentialsReady({ ...config, privateKey }) ||
    !privateKey ||
    !config.keyId ||
    !config.teamId ||
    !config.bundleId
  ) {
    return { sent: false, reason: 'credentials_missing' };
  }
  const providerToken = jwt.sign({}, privateKey, {
    algorithm: 'ES256',
    issuer: config.teamId,
    expiresIn: '50m',
    header: { alg: 'ES256', kid: config.keyId },
  });
  const host = config.useSandbox
    ? 'api.sandbox.push.apple.com'
    : 'api.push.apple.com';
  return new Promise((resolve) => {
    const client = http2.connect(`https://${host}`);
    const finish = (result: { sent: boolean; reason?: string }) => {
      client.close();
      resolve(result);
    };
    client.on('error', () => finish({ sent: false, reason: 'send_failed' }));
    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${input.token}`,
      authorization: `bearer ${providerToken}`,
      'apns-topic': config.bundleId!,
      'apns-push-type': 'alert',
      'apns-priority': '10',
    });
    let status = 0;
    req.setEncoding('utf8');
    req.on('response', (headers) => {
      status = Number(headers[':status'] ?? 0);
    });
    req.on('error', () => finish({ sent: false, reason: 'send_failed' }));
    req.on('end', () => {
      finish(
        status === 200
          ? { sent: true }
          : { sent: false, reason: 'send_failed' },
      );
    });
    req.end(
      JSON.stringify({
        aps: {
          alert: { title: input.title, body: input.body },
          sound: 'default',
        },
        suggestionId: input.suggestionId,
      }),
    );
  });
}

export async function sendResendEmail(input: {
  apiKey: string;
  from: string;
  to: string;
  title: string;
  body: string;
}): Promise<{ sent: boolean; reason?: string }> {
  if (!input.apiKey.trim()) return { sent: false, reason: 'not_configured' };
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      subject: input.title,
      text: input.body,
    }),
  });
  return res.ok
    ? { sent: true }
    : { sent: false, reason: 'send_failed' };
}
