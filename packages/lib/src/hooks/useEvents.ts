import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '../supabaseClient';
import type { Event } from '@daypilot/types';

export function useEvents(calendarId?: string) {
  return useQuery({
    queryKey: ['events', calendarId],
    queryFn: async () => {
      try {
        let query = supabaseClient
          .from('events')
          .select('*')
          .order('start', { ascending: true });

        if (calendarId) {
          query = query.eq('calendar_id', calendarId);
        }

        const { data, error } = await query;

        if (error) {
          // Create a more descriptive error
          const errorMessage = error.message || 'Failed to load events';
          const errorCode = error.code || 'UNKNOWN';
          throw new Error(`${errorMessage} (Code: ${errorCode})`);
        }
        
        return (data || []) as Event[];
      } catch (err) {
        // Re-throw with better error message
        if (err instanceof Error) {
          throw err;
        }
        throw new Error('Failed to load events: Unknown error');
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: Omit<Event, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabaseClient
        .from('events')
        .insert(event)
        .select()
        .single();

      if (error) throw error;
      return data as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Event> & { id: string }) => {
      const { data, error } = await supabaseClient
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseClient.from('events').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
