import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '../supabaseClient';
import type { Entitlements } from '@daypilot/types';

/**
 * Fetch user entitlements
 */
export function useEntitlements() {
  return useQuery({
    queryKey: ['entitlements'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      // Try to get entitlements
      const { data: initialData, error } = await supabaseClient
        .from('entitlements')
        .select('*')
        .eq('user_id', user.id)
        .single();

      let data = initialData;

      // If not found, create default (free tier)
      if (error && error.code === 'PGRST116') {
        const { data: newData, error: createError } = await supabaseClient.rpc(
          'get_or_create_entitlements',
          { user_uuid: user.id }
        );

        if (createError) throw createError;
        data = newData;
      } else if (error) {
        throw error;
      }

      return data as Entitlements;
    },
  });
}

/**
 * Check if user can use AI features
 */
export function canUseAI(entitlements: Entitlements | undefined): boolean {
  if (!entitlements) return false;
  return entitlements.ai_enabled || (entitlements.ai_credits > 0);
}

/**
 * Check if user can sync calendars
 */
export function canSyncCalendars(
  entitlements: Entitlements | undefined,
  currentConnections: number
): boolean {
  if (!entitlements) return false;
  return currentConnections < entitlements.max_connected_calendars;
}

/**
 * Get sync frequency in minutes
 */
export function syncFrequency(entitlements: Entitlements | undefined): number {
  if (!entitlements) return 60;
  return entitlements.sync_frequency_minutes;
}

/**
 * Check if user has credits remaining
 */
export function hasCredits(entitlements: Entitlements | undefined): boolean {
  if (!entitlements) return false;
  if (entitlements.ai_enabled) return true; // Unlimited if enabled
  return entitlements.ai_credits > 0;
}

/**
 * Get remaining credits
 */
export function remainingCredits(entitlements: Entitlements | undefined): number {
  if (!entitlements) return 0;
  if (entitlements.ai_enabled) return -1; // Unlimited
  return entitlements.ai_credits;
}

/**
 * Check if user can use booking links (premium feature)
 */
export function canUseBookingLinks(entitlements: Entitlements | undefined): boolean {
  if (!entitlements) return false;
  return entitlements.booking_links_enabled || entitlements.tier !== 'free';
}
