import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '../supabaseClient';
import type { ConnectedAccount, CalendarMapping } from '@daypilot/types';

/**
 * Fetch user's connected accounts
 */
export function useConnectedAccounts() {
  return useQuery({
    queryKey: ['connected_accounts'],
    queryFn: async () => {
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
 * Disconnect a connected account
 */
export function useDisconnectAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
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
 * Initiate Google OAuth connection
 */
export function useConnectGoogle() {
  return useMutation({
    mutationFn: async () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        throw new Error('Supabase not configured');
      }

      // Get current user
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabaseClient.auth.getUser();

      if (userError || !currentUser) {
        console.error('User error:', userError);
        throw new Error('Not authenticated. Please sign in again.');
      }

      // Build authorize URL with user_id and return path
      // The authorize function is PUBLIC but still needs apikey for Supabase gateway
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const returnPath = '/app/integrations';
      const authorizeUrl = `${supabaseUrl}/functions/v1/google-oauth-authorize?user_id=${currentUser.id}&state=${encodeURIComponent(returnPath)}&apikey=${supabaseAnonKey}`;

      // Redirect directly to authorize function (apikey allows public access)
      window.location.href = authorizeUrl;
    },
  });
}

/**
 * Discover and map Google calendars.
 * Uses supabase.functions.invoke so the session JWT is sent automatically (avoids CORS preflight issues).
 */
export function useDiscoverCalendars() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectedAccountId: string) => {
      if (
        !import.meta.env.VITE_SUPABASE_URL ||
        import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co'
      ) {
        throw new Error('Supabase not configured');
      }

      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabaseClient.functions.invoke(
        'google-discover',
        {
          body: { connectedAccountId },
        }
      );

      if (error) {
        console.error('Calendar discovery error:', { error, data });
        throw new Error(error.message || 'Failed to discover calendars');
      }

      if (data?.error) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : data.error?.message || 'Failed to discover calendars'
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
 * Check if user has a connected Google account
 */
export function useGoogleAccountStatus() {
  return useQuery({
    queryKey: ['google_account_status'],
    queryFn: async () => {
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
        // PGRST116 is "not found" which is fine
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
