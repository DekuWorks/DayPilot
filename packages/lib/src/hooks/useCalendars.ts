import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '../supabaseClient';
import type { Calendar } from '@daypilot/types';

export function useCalendars() {
  return useQuery({
    queryKey: ['calendars'],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('calendars')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Calendar[];
    },
  });
}

export function useCreateCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (calendar: Omit<Calendar, 'id' | 'created_at'>) => {
      const { data, error } = await supabaseClient
        .from('calendars')
        .insert(calendar)
        .select()
        .single();

      if (error) throw error;
      return data as Calendar;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars'] });
    },
  });
}
