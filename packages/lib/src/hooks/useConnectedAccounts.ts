import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '../supabaseClient';
import { getApiConfig } from '../apiConfig';
import type { ConnectedAccount, CalendarMapping } from '@daypilot/types';

/**
 * Fetch user's connected accounts (Supabase or DayPilot API when set)
 */
export function useConnectedAccounts() {
  return useQuery({
    queryKey: ['connected_accounts', getApiConfig()?.apiUrl ?? 'supabase'],
    queryFn: async () => {
      const api = getApiConfig();
      if (api) {
        const token = api.getToken();
        if (!token) throw new Error('Not authenticated');
        const base = api.apiUrl.replace(/\/$/, '');
        const url = base.endsWith('/api') ? `${base}/me/connected-accounts` : `${base}/api/me/connected-accounts`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) throw new Error('Not authenticated');
        if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
        const data = await res.json();
        return (Array.isArray(data) ? data : []) as ConnectedAccount[];
      }

      const {
        data: { user },
      } = await supabaseClient.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabaseClient
        .from('connected_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ConnectedAccount[];
    },
  });
}

/**
 * Fetch calendar mappings for connected accounts
 */
export function useCalendarMappings() {
  return useQuery({
    queryKey: ['calendar_mappings'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabaseClient
        .from('calendar_mappings')
        .select(
          `
          *,
          connected_accounts!inner(user_id)
        `
        )
        .eq('connected_accounts.user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as CalendarMapping[];
    },
  });
}

/**
 * Disconnect a connected account (Supabase or DayPilot API when set)
 */
export function useDisconnectAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      const api = getApiConfig();
      if (api) {
        const token = api.getToken();
        if (!token) throw new Error('Not authenticated');
        const base = api.apiUrl.replace(/\/$/, '');
        const url = base.endsWith('/api') ? `${base}/me/connected-accounts/${accountId}` : `${base}/api/me/connected-accounts/${accountId}`;
        const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        if (res.status === 401) throw new Error('Not authenticated');
        if (res.status === 404) return;
        if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
        return;
      }

      const { error } = await supabaseClient
        .from('connected_accounts')
        .update({ is_active: false })
        .eq('id', accountId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connected_accounts'] });
      queryClient.invalidateQueries({ queryKey: ['calendar_mappings'] });
    },
  });
}

/**
 * Initiate Google OAuth connection (Supabase or DayPilot API when set)
 */
export function useConnectGoogle() {
  return useMutation({
    mutationFn: async () => {
      const api = getApiConfig();
      if (api) {
        const token = api.getToken();
        if (!token) throw new Error('Not authenticated. Please sign in again.');
        const base = api.apiUrl.replace(/\/$/, '');
        const authPath = base.endsWith('/api') ? `${base}/google/authorize` : `${base}/api/google/authorize`;
        const returnPath = '/app/integrations';
        window.location.href = `${authPath}?return_path=${encodeURIComponent(returnPath)}&token=${encodeURIComponent(token)}`;
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        throw new Error('Supabase not configured');
      }

      const {
        data: { user: currentUser },
        error: userError,
      } = await supabaseClient.auth.getUser();

      if (userError || !currentUser) {
        console.error('User error:', userError);
        throw new Error('Not authenticated. Please sign in again.');
      }

      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const returnPath = '/app/integrations';
      const authorizeUrl = `${supabaseUrl}/functions/v1/google-oauth-authorize?user_id=${currentUser.id}&state=${encodeURIComponent(returnPath)}&apikey=${supabaseAnonKey}`;

      window.location.href = authorizeUrl;
    },
  });
}

/**
 * Discover and map Google calendars.
 * If VITE_GOOGLE_DISCOVER_API_URL is set, calls your custom API (e.g. C#); otherwise calls Supabase Edge Function.
 */
export function useDiscoverCalendars() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectedAccountId: string) => {
      const api = getApiConfig();
      const customApiUrl = (import.meta.env.VITE_GOOGLE_DISCOVER_API_URL as string | undefined) || api?.apiUrl;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      let token: string | null = api?.getToken() ?? null;
      if (!token && !api) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        token = session?.access_token ?? null;
      }
      if (!token) {
        throw new Error('Not authenticated');
      }

      const url = customApiUrl
        ? (() => {
            const base = customApiUrl.replace(/\/$/, '');
            if (base.endsWith('/discover')) return base;
            if (base.endsWith('/api/google')) return `${base}/discover`;
            return `${base}/api/google/discover`;
          })()
        : supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co'
          ? `${supabaseUrl}/functions/v1/google-discover${anonKey ? `?apikey=${encodeURIComponent(anonKey)}` : ''}`
          : '';

      if (!url) {
        throw new Error(
          'Supabase not configured and VITE_GOOGLE_DISCOVER_API_URL / VITE_API_URL not set.'
        );
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ connectedAccountId }),
      });

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const rawMsg =
          (data && typeof (data as { error?: string }).error === 'string'
            ? (data as { error: string }).error
            : null) ||
          `HTTP ${response.status}`;
        const isFetchError =
          response.status === 0 ||
          rawMsg.includes('Failed to send') ||
          rawMsg.includes('fetch failed');
        const msg = isFetchError
          ? `${rawMsg} Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in production, and that the google-discover Edge Function is deployed (supabase functions deploy google-discover).`
          : rawMsg;
        console.error('Calendar discovery error:', { response, data });
        throw new Error(msg);
      }

      if (data && typeof data === 'object' && (data as { error?: unknown }).error) {
        const err = (data as { error: string | { message?: string } }).error;
        throw new Error(
          typeof err === 'string' ? err : err?.message || 'Failed to discover calendars'
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar_mappings'] });
      queryClient.invalidateQueries({ queryKey: ['calendars'] });
    },
  });
}

/**
 * Sync a calendar mapping
 */
/**
 * Check if user has a connected Google account (Supabase or DayPilot API when set)
 */
export function useGoogleAccountStatus() {
  return useQuery({
    queryKey: ['google_account_status', getApiConfig()?.apiUrl ?? 'supabase'],
    queryFn: async () => {
      const api = getApiConfig();
      if (api) {
        const token = api.getToken();
        if (!token) return { connected: false };
        const base = api.apiUrl.replace(/\/$/, '');
        const url = base.endsWith('/api') ? `${base}/me/connected-accounts` : `${base}/api/me/connected-accounts`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.status === 401) return { connected: false };
        if (!res.ok) return { connected: false };
        const data = await res.json();
        return { connected: Array.isArray(data) && data.length > 0 };
      }

      const {
        data: { user },
      } = await supabaseClient.auth.getUser();

      if (!user) {
        return { connected: false };
      }

      const { data, error } = await supabaseClient
        .from('google_accounts')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking Google account status:', error);
        return { connected: false };
      }

      return { connected: !!data };
    },
  });
}

export function useSyncCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (calendarMappingId: string) => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        throw new Error('Supabase not configured');
      }

      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/google-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabaseAnonKey || '',
        },
        body: JSON.stringify({ calendarMappingId }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP ${response.status}` };
        }
        throw new Error(errorData.error || 'Failed to sync calendar');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar_mappings'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
