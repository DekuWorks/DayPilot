import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAttendees,
  saveAttendees,
  generateInviteToken,
} from '../storage/storageAdapter';
import type { Attendee, RSVPStatus } from '@daypilot/types';

// Get attendees for an event
export function useEventAttendees(eventId: string | null) {
  return useQuery({
    queryKey: ['attendees', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const allAttendees = await getAttendees();
      return allAttendees.filter(a => a.eventId === eventId);
    },
    enabled: !!eventId,
  });
}

// Get attendee by invite token (for RSVP page)
export function useAttendeeByToken(token: string | null) {
  return useQuery({
    queryKey: ['attendee', token],
    queryFn: async () => {
      if (!token) return null;
      // For Supabase, we can query directly by token
      const { supabaseClient } = await import('../supabaseClient');
      const { data, error } = await supabaseClient
        .from('attendees')
        .select('*')
        .eq('invite_token', token)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        eventId: data.event_id,
        email: data.email,
        name: data.name,
        role: data.role,
        rsvpStatus: data.rsvp_status,
        inviteToken: data.invite_token,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      } as Attendee;
    },
    enabled: !!token,
  });
}

// Add attendee to event
export function useAddAttendee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      eventId: string;
      email: string;
      name?: string;
      role?: 'organizer' | 'attendee';
    }) => {
      const allAttendees = await getAttendees();

      // Check for duplicates
      const existing = allAttendees.find(
        a =>
          a.eventId === data.eventId &&
          a.email.toLowerCase() === data.email.toLowerCase()
      );
      if (existing) {
        throw new Error('Attendee already added to this event');
      }

      const inviteToken = await generateInviteToken();
      const newAttendee: Attendee = {
        id: `attendee-${Date.now()}`,
        eventId: data.eventId,
        email: data.email,
        name: data.name || null,
        role: data.role || 'attendee',
        rsvpStatus: 'pending',
        inviteToken,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveAttendees([...allAttendees, newAttendee]);
      return newAttendee;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['attendees', variables.eventId],
      });
    },
  });
}

// Remove attendee
export function useRemoveAttendee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { attendeeId: string; eventId: string }) => {
      const allAttendees = await getAttendees();
      const attendee = allAttendees.find(a => a.id === data.attendeeId);

      // Prevent removing organizer
      if (attendee?.role === 'organizer') {
        throw new Error('Cannot remove organizer');
      }

      const updated = allAttendees.filter(a => a.id !== data.attendeeId);
      await saveAttendees(updated);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['attendees', variables.eventId],
      });
    },
  });
}

// Update RSVP status
export function useUpdateRSVP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      attendeeId: string;
      eventId: string;
      rsvpStatus: RSVPStatus;
    }) => {
      const allAttendees = await getAttendees();
      const updated = allAttendees.map(a =>
        a.id === data.attendeeId
          ? {
              ...a,
              rsvpStatus: data.rsvpStatus,
              updatedAt: new Date().toISOString(),
            }
          : a
      );
      await saveAttendees(updated);
      return updated.find(a => a.id === data.attendeeId)!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['attendees', variables.eventId],
      });
      queryClient.invalidateQueries({ queryKey: ['attendee'] });
    },
  });
}
