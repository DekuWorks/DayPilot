import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '../supabaseClient';
import type { BookingLink, AvailabilityRule, BookingExcludedDate, Booking } from '@daypilot/types';

// Fetch user's booking links
export function useBookingLinks(organizationId?: string | null) {
  return useQuery({
    queryKey: ['booking-links', organizationId],
    queryFn: async () => {
      let query = supabaseClient
        .from('booking_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      } else {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
          query = query.eq('owner_user_id', user.id).is('organization_id', null);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BookingLink[];
    },
  });
}

// Fetch booking link by slug (for public page)
export function useBookingLinkBySlug(slug: string | null) {
  return useQuery({
    queryKey: ['booking-link', slug],
    queryFn: async () => {
      if (!slug) return null;

      const { data, error } = await supabaseClient
        .from('booking_links')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data as BookingLink;
    },
    enabled: !!slug,
  });
}

// Fetch availability rules for a booking link
export function useAvailabilityRules(bookingLinkId: string | null) {
  return useQuery({
    queryKey: ['availability-rules', bookingLinkId],
    queryFn: async () => {
      if (!bookingLinkId) return [];

      const { data, error } = await supabaseClient
        .from('availability_rules')
        .select('*')
        .eq('booking_link_id', bookingLinkId)
        .order('day_of_week', { ascending: true });

      if (error) throw error;
      return data as AvailabilityRule[];
    },
    enabled: !!bookingLinkId,
  });
}

// Fetch excluded dates for a booking link
export function useExcludedDates(bookingLinkId: string | null) {
  return useQuery({
    queryKey: ['excluded-dates', bookingLinkId],
    queryFn: async () => {
      if (!bookingLinkId) return [];

      const { data, error } = await supabaseClient
        .from('booking_excluded_dates')
        .select('*')
        .eq('booking_link_id', bookingLinkId)
        .order('excluded_date', { ascending: true });

      if (error) throw error;
      return data as BookingExcludedDate[];
    },
    enabled: !!bookingLinkId,
  });
}

// Fetch bookings for a booking link
export function useBookings(bookingLinkId: string | null) {
  return useQuery({
    queryKey: ['bookings', bookingLinkId],
    queryFn: async () => {
      if (!bookingLinkId) return [];

      const { data, error } = await supabaseClient
        .from('bookings')
        .select('*')
        .eq('booking_link_id', bookingLinkId)
        .order('start_time', { ascending: false });

      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!bookingLinkId,
  });
}

// Create booking link
export function useCreateBookingLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title?: string;
      description?: string;
      duration?: number;
      buffer_before?: number;
      buffer_after?: number;
      min_notice?: number;
      max_per_day?: number | null;
      timezone?: string;
      type?: 'one-on-one' | 'group';
      organization_id?: string | null;
    }) => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate slug from title or use default
      const baseSlug = data.title
        ? data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
        : `booking-${Date.now()}`;

      const slug = baseSlug || `booking-${Date.now()}`;

      const { data: bookingLink, error } = await supabaseClient
        .from('booking_links')
        .insert({
          owner_user_id: data.organization_id ? null : user.id,
          organization_id: data.organization_id || null,
          slug,
          title: data.title || null,
          description: data.description || null,
          duration: data.duration || 30,
          buffer_before: data.buffer_before || 0,
          buffer_after: data.buffer_after || 0,
          min_notice: data.min_notice || 60,
          max_per_day: data.max_per_day || null,
          timezone: data.timezone || 'UTC',
          type: data.type || 'one-on-one',
        })
        .select()
        .single();

      if (error) throw error;
      return bookingLink as BookingLink;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['booking-links', variables.organization_id] });
    },
  });
}

// Update booking link
export function useUpdateBookingLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
      organizationId: _organizationId,
    }: {
      id: string;
      updates: Partial<BookingLink>;
      organizationId?: string | null;
    }) => {
      const { data, error } = await supabaseClient
        .from('booking_links')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as BookingLink;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['booking-links', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['booking-link'] });
    },
  });
}

// Delete booking link
export function useDeleteBookingLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      organizationId: _organizationId,
    }: {
      id: string;
      organizationId?: string | null;
    }) => {
      const { error } = await supabaseClient
        .from('booking_links')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['booking-links', variables.organizationId] });
    },
  });
}

// Create booking (public)
export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      booking_link_id: string;
      booker_name: string;
      booker_email: string;
      booker_phone?: string;
      start_time: string;
      end_time: string;
      timezone: string;
      notes?: string;
    }) => {
      // Generate confirmation token
      const { data: tokenData, error: tokenError } = await supabaseClient.rpc(
        'generate_confirmation_token'
      );
      if (tokenError) throw tokenError;

      const { data: booking, error } = await supabaseClient
        .from('bookings')
        .insert({
          ...data,
          confirmation_token: tokenData,
          status: 'confirmed',
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger booking confirmation email (fire and forget)
      // This will be handled by the Edge Function
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co') {
          // Call the edge function asynchronously (don't wait for response)
          fetch(`${supabaseUrl}/functions/v1/send-booking-confirmation`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ bookingId: booking.id }),
          }).catch((err) => {
            console.error('Error triggering booking confirmation email:', err);
            // Don't throw - booking was created successfully
          });
        }
      } catch (err) {
        console.error('Error triggering booking confirmation email:', err);
        // Don't throw - booking was created successfully
      }

      return booking as Booking;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', variables.booking_link_id] });
    },
  });
}





