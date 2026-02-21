/**
 * When migrating off Supabase, the app sets API base URL and token getter here.
 * Hooks (useConnectedAccounts, useConnectGoogle, useDiscoverCalendars, etc.)
 * use this when set instead of Supabase.
 */
let apiConfig: { apiUrl: string; getToken: () => string | null } | null = null;

export function setApiConfig(config: { apiUrl: string; getToken: () => string | null } | null) {
  apiConfig = config;
}

export function getApiConfig(): { apiUrl: string; getToken: () => string | null } | null {
  return apiConfig;
}

export function isApiMode(): boolean {
  return apiConfig != null && apiConfig.apiUrl.length > 0;
}
