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
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        throw new Error('Supabase not configured');
      }

      // Get fresh session
      const {
        data: { session },
        error: sessionError,
      } = await supabaseClient.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Failed to get session: ' + sessionError.message);
      }

      if (!session) {
        throw new Error('Not authenticated. Please sign in again.');
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/google-oauth?action=authorize`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: supabaseAnonKey || '',
          },
        }
      );

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          const errorText = await response.text();
          errorData = { error: errorText || `HTTP ${response.status}` };
        }
        console.error('OAuth request failed:', errorData);
        throw new Error(errorData.error || 'Failed to initiate OAuth');
      }

      const { url } = await response.json();
      if (!url) {
        throw new Error('No OAuth URL returned from server');
      }
      
      window.location.href = url;
    },
  });
}

/**
 * Discover and map Google calendars
 */
export function useDiscoverCalendars() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectedAccountId: string) => {
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

      const response = await fetch(
        `${supabaseUrl}/functions/v1/google-discover`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: supabaseAnonKey || '',
          },
          body: JSON.stringify({ connectedAccountId }),
        }
      );

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP ${response.status}` };
        }
        throw new Error(errorData.error || 'Failed to discover calendars');
      }

      return await response.json();
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
