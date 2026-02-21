import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  'http://localhost:5174/app/integrations/google/callback';

/**
 * Create OAuth2 client for Google
 */
export function createGoogleOAuthClient() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

/**
 * Generate Google OAuth authorization URL
 */
export function getGoogleAuthUrl(userId: string, state?: string): string {
  const oauth2Client = createGoogleOAuthClient();

  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force consent to get refresh token
    state: state || userId,
  });

  return authUrl;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}> {
  const oauth2Client = createGoogleOAuthClient();

  const { tokens } = await oauth2Client.getToken(code);

  return {
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expiry_date
      ? Math.floor((tokens.expiry_date - Date.now()) / 1000)
      : undefined,
    scope: tokens.scope,
  };
}

/**
 * Get or refresh access token
 */
export async function getAccessToken(
  userId: string,
  providerAccountId: string
): Promise<string> {
  // Get stored tokens
  const { data: account, error } = await supabase
    .from('connected_accounts')
    .select('access_token, refresh_token, token_expires_at')
    .eq('user_id', userId)
    .eq('provider_account_id', providerAccountId)
    .eq('provider', 'google')
    .single();

  if (error || !account) {
    throw new Error('Connected account not found');
  }

  // Check if token is expired
  const expiresAt = account.token_expires_at
    ? new Date(account.token_expires_at)
    : null;
  const isExpired = expiresAt && expiresAt.getTime() < Date.now() + 60000; // 1 minute buffer

  if (!isExpired && account.access_token) {
    return account.access_token;
  }

  // Refresh token
  if (!account.refresh_token) {
    throw new Error(
      'No refresh token available. Please reconnect your account.'
    );
  }

  const oauth2Client = createGoogleOAuthClient();
  oauth2Client.setCredentials({
    refresh_token: account.refresh_token,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();

  // Update stored token
  await supabase
    .from('connected_accounts')
    .update({
      access_token: credentials.access_token!,
      token_expires_at: credentials.expiry_date
        ? new Date(credentials.expiry_date).toISOString()
        : null,
    })
    .eq('user_id', userId)
    .eq('provider_account_id', providerAccountId)
    .eq('provider', 'google');

  return credentials.access_token!;
}

/**
 * Get Google user info
 */
export async function getGoogleUserInfo(accessToken: string): Promise<{
  id: string;
  email: string;
  name?: string;
}> {
  const oauth2Client = createGoogleOAuthClient();
  oauth2Client.setCredentials({ access_token: accessToken });

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  return {
    id: data.id!,
    email: data.email!,
    name: data.name || undefined,
  };
}

/**
 * Store connected account in database
 */
export async function storeConnectedAccount(
  userId: string,
  providerAccountId: string,
  email: string,
  accessToken: string,
  refreshToken?: string,
  expiresIn?: number,
  scope?: string
): Promise<void> {
  const tokenExpiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null;

  await supabase.from('connected_accounts').upsert(
    {
      user_id: userId,
      provider: 'google',
      provider_account_id: providerAccountId,
      email,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expires_at: tokenExpiresAt,
      scope,
      is_active: true,
    },
    {
      onConflict: 'user_id,provider,provider_account_id',
    }
  );
}
