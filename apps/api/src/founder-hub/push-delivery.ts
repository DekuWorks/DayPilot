export type NoticePrefs = {
  inApp: boolean;
  push: boolean;
  email: boolean;
};

export function defaultNoticePrefs(): NoticePrefs {
  return { inApp: true, push: true, email: false };
}

/**
 * Remote Apple push is attempted only when the API process has APNs credentials.
 * Missing credentials must not be reported as a delivered banner.
 */
export function apnsCredentialsReady(env: {
  keyId?: string | null;
  teamId?: string | null;
  bundleId?: string | null;
  privateKey?: string | null;
  p8Path?: string | null;
}): boolean {
  const key = env.privateKey?.trim() || env.p8Path?.trim();
  return Boolean(
    env.keyId?.trim() && env.teamId?.trim() && env.bundleId?.trim() && key,
  );
}

export function deliveryPlan(input: {
  kind: string;
  prefs: NoticePrefs;
  apnsReady: boolean;
  hasDevice: boolean;
  resendReady: boolean;
}): {
  storeInApp: boolean;
  push: { attempt: boolean; reason?: 'credentials_missing' | 'no_device' | 'opted_out' };
  email: { attempt: boolean; reason?: 'not_configured' | 'opted_out' };
} {
  const ownerMessage = input.kind === 'founder_message';
  const storeInApp = ownerMessage || input.prefs.inApp;
  let push: {
    attempt: boolean;
    reason?: 'credentials_missing' | 'no_device' | 'opted_out';
  };
  if (!input.prefs.push) push = { attempt: false, reason: 'opted_out' };
  else if (!input.apnsReady) {
    push = { attempt: false, reason: 'credentials_missing' };
  } else if (!input.hasDevice) push = { attempt: false, reason: 'no_device' };
  else push = { attempt: true };

  let email: { attempt: boolean; reason?: 'not_configured' | 'opted_out' };
  if (!input.prefs.email) email = { attempt: false, reason: 'opted_out' };
  else if (!input.resendReady) email = { attempt: false, reason: 'not_configured' };
  else email = { attempt: true };

  return { storeInApp, push, email };
}
