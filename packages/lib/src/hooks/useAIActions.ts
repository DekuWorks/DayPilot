import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '../supabaseClient';
import type { AIAction, AIBlock } from '@daypilot/types';

// Generate day using AI
export function useGenerateDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      date?: string;
      backlog_tasks?: Array<{
        title: string;
        description?: string;
        priority?: 'high' | 'medium' | 'low';
        estimated_duration?: number;
      }>;
    }) => {
      // Entitlement check is done server-side in the Edge Function

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        throw new Error('Supabase not configured');
      }

      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/generate-day`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate day');
      }

      const result = await response.json();
      return result as {
        action_id: string | null;
        blocks: AIBlock[];
        conflicts: string[];
        notes: string[];
        existing_events: number;
        new_blocks: number;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-actions'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

// Get AI actions for user
export function useAIActions() {
  return useQuery({
    queryKey: ['ai-actions'],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('ai_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as AIAction[];
    },
  });
}

// Get latest AI action
export function useLatestAIAction() {
  return useQuery({
    queryKey: ['ai-actions', 'latest'],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('ai_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data as AIAction | null;
    },
  });
}

// Apply AI action (create events from blocks)
export function useApplyAIAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      actionId,
      blocks,
      calendarId,
    }: {
      actionId: string;
      blocks: AIBlock[];
      calendarId: string;
    }) => {
      // Get default calendar if not provided
      let targetCalendarId = calendarId;
      if (!targetCalendarId) {
        const { data: calendars } = await supabaseClient
          .from('calendars')
          .select('id')
          .eq('is_default', true)
          .limit(1)
          .single();

        if (calendars) {
          targetCalendarId = calendars.id;
        } else {
          throw new Error('No default calendar found');
        }
      }

      // Create events from blocks (only tasks, not existing events)
      const eventsToCreate = blocks.filter((block) => block.type === 'task');
      const createdEventIds: string[] = [];

      for (const block of eventsToCreate) {
        const { data: event, error } = await supabaseClient
          .from('events')
          .insert({
            calendar_id: targetCalendarId,
            title: block.title,
            description: block.description || `AI-generated: ${block.reason || ''}`,
            start: block.start,
            end: block.end,
            status: 'scheduled',
          })
          .select('id')
          .single();

        if (error) {
          console.error('Error creating event:', error);
          continue;
        }

        if (event) {
          createdEventIds.push(event.id);
        }
      }

      // Update AI action status
      const { error: updateError } = await supabaseClient
        .from('ai_actions')
        .update({
          status: 'applied',
          created_events: createdEventIds,
        })
        .eq('id', actionId);

      if (updateError) {
        console.error('Error updating AI action:', updateError);
      }

      // Decrement credits if not ai_enabled
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();
      if (user) {
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('ai_enabled')
          .eq('id', user.id)
          .single();

        if (profile && !profile.ai_enabled) {
          await supabaseClient.rpc('decrement_ai_credits', { user_uuid: user.id });
        }
      }

      return { createdEventIds, actionId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-actions'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

// Undo AI action (delete created events)
export function useUndoAIAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (actionId: string) => {
      // Get AI action
      const { data: action, error: fetchError } = await supabaseClient
        .from('ai_actions')
        .select('created_events, status')
        .eq('id', actionId)
        .single();

      if (fetchError || !action) {
        throw new Error('AI action not found');
      }

      if (action.status !== 'applied') {
        throw new Error('Can only undo applied actions');
      }

      // Delete created events
      const eventIds = action.created_events || [];
      if (eventIds.length > 0) {
        const { error: deleteError } = await supabaseClient
          .from('events')
          .delete()
          .in('id', eventIds);

        if (deleteError) {
          throw deleteError;
        }
      }

      // Update AI action status to rejected
      const { error: updateError } = await supabaseClient
        .from('ai_actions')
        .update({ status: 'rejected' })
        .eq('id', actionId);

      if (updateError) {
        throw updateError;
      }

      return { actionId, deletedEvents: eventIds.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-actions'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
