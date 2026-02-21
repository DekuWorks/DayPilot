import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '../supabaseClient';
import type { Organization, OrganizationMember } from '@daypilot/types';

// Fetch user's organizations
export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Organization[];
    },
  });
}

// Fetch organization members
export function useOrganizationMembers(organizationId: string | null) {
  return useQuery({
    queryKey: ['organization-members', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabaseClient
        .from('organization_members')
        .select(
          `
          *,
          profiles:user_id (
            id,
            email,
            name,
            avatar_url
          )
        `
        )
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (OrganizationMember & {
        profiles: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
        };
      })[];
    },
    enabled: !!organizationId,
  });
}

// Create organization
export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; plan?: string }) => {
      // Generate slug from name
      const slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const { data: org, error } = await supabaseClient
        .from('organizations')
        .insert({
          name: data.name,
          slug: slug,
          plan: data.plan || 'free',
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as owner member
      const { data: user } = await supabaseClient.auth.getUser();
      if (user.user) {
        await supabaseClient.from('organization_members').insert({
          user_id: user.user.id,
          organization_id: org.id,
          role: 'owner',
        });
      }

      return org as Organization;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

// Update organization
export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Organization>;
    }) => {
      const { data, error } = await supabaseClient
        .from('organizations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Organization;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

// Delete organization
export function useDeleteOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseClient
        .from('organizations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

// Add organization member
export function useAddOrganizationMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      userId,
      role = 'member',
    }: {
      organizationId: string;
      userId: string;
      role?: 'owner' | 'admin' | 'member' | 'viewer';
    }) => {
      const { data, error } = await supabaseClient
        .from('organization_members')
        .insert({
          organization_id: organizationId,
          user_id: userId,
          role,
        })
        .select()
        .single();

      if (error) throw error;
      return data as OrganizationMember;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['organization-members', variables.organizationId],
      });
    },
  });
}

// Update organization member role
export function useUpdateOrganizationMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      role,
      organizationId: _organizationId,
    }: {
      id: string;
      role: 'owner' | 'admin' | 'member' | 'viewer';
      organizationId: string;
    }) => {
      const { data, error } = await supabaseClient
        .from('organization_members')
        .update({ role })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as OrganizationMember;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['organization-members', variables.organizationId],
      });
    },
  });
}

// Remove organization member
export function useRemoveOrganizationMember() {
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
        .from('organization_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['organization-members', variables.organizationId],
      });
    },
  });
}
