import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '../supabaseClient';
import type { Location } from '@daypilot/types';

// Fetch locations for an organization
export function useLocations(organizationId: string | null) {
  return useQuery({
    queryKey: ['locations', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabaseClient
        .from('locations')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Location[];
    },
    enabled: !!organizationId,
  });
}

// Create location
export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      organization_id: string;
      name: string;
      timezone?: string;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      postal_code?: string;
    }) => {
      const { data: location, error } = await supabaseClient
        .from('locations')
        .insert({
          ...data,
          timezone: data.timezone || 'UTC',
        })
        .select()
        .single();

      if (error) throw error;
      return location as Location;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['locations', variables.organization_id],
      });
    },
  });
}

// Update location
export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
      organizationId: _organizationId,
    }: {
      id: string;
      updates: Partial<Location>;
      organizationId: string;
    }) => {
      const { data, error } = await supabaseClient
        .from('locations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Location;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['locations', variables.organizationId],
      });
    },
  });
}

// Delete location
export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      organizationId: _organizationId,
    }: {
      id: string;
      organizationId: string;
    }) => {
      const { error } = await supabaseClient
        .from('locations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['locations', variables.organizationId],
      });
    },
  });
}




