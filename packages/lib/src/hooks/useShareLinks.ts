import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getShareLinks, generateShareToken } from '../storage/storageAdapter';
import type { ShareLink, ShareMode } from '@daypilot/types';
import { supabaseClient } from '../supabaseClient';

// Get current user ID (for localStorage MVP)
async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  return user?.id || 'local-user';
}

// Fetch user's share links
export function useShareLinks() {
  return useQuery({
    queryKey: ['share-links'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();
      if (!user) return [];

      // Always query Supabase directly for share links
      const { data, error } = await supabaseClient
        .from('share_links')
        .select('*')
        .eq('user_id', user.id)
        .is('revoked_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching share links:', error);
        return [];
      }

      return (data || []).map((s: any) => ({
        id: s.id,
        userId: s.user_id,
        token: s.token,
        mode: s.mode,
        createdAt: s.created_at,
        revokedAt: s.revoked_at,
      }));
    },
  });
}

// Get share link by token (for public view)
export function useShareLinkByToken(token: string | null) {
  return useQuery({
    queryKey: ['share-link', token],
    queryFn: async () => {
      if (!token) return null;
      // Query Supabase directly for public access
      const { data, error } = await supabaseClient
        .from('share_links')
        .select('*')
        .eq('token', token)
        .is('revoked_at', null)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        token: data.token,
        mode: data.mode,
        createdAt: data.created_at,
        revokedAt: data.revoked_at,
      } as ShareLink;
    },
    enabled: !!token,
  });
}

// Create share link
export function useCreateShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { mode: ShareMode }) => {
      const userId = await getCurrentUserId();
      if (!userId || userId === 'local-user') {
        throw new Error('Not authenticated');
      }

      // Check if user already has an active link
      const allLinks = await getShareLinks();
      const existingLink = allLinks.find(
        link => link.userId === userId && !link.revokedAt
      );

      if (existingLink) {
        // Update existing link to unrevoke it and update mode
        const { data: updated, error } = await supabaseClient
          .from('share_links')
          .update({
            mode: data.mode,
            revoked_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingLink.id)
          .select()
          .single();

        if (error) throw error;

        return {
          id: updated.id,
          userId: updated.user_id,
          token: updated.token,
          mode: updated.mode,
          createdAt: updated.created_at,
          revokedAt: updated.revoked_at,
        } as ShareLink;
      }

      // Create new link directly in Supabase
      const token = await generateShareToken();
      const { data: newLink, error } = await supabaseClient
        .from('share_links')
        .insert({
          user_id: userId,
          token,
          mode: data.mode,
          revoked_at: null,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: newLink.id,
        userId: newLink.user_id,
        token: newLink.token,
        mode: newLink.mode,
        createdAt: newLink.created_at,
        revokedAt: newLink.revoked_at,
      } as ShareLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share-links'] });
    },
  });
}

// Update share link
export function useUpdateShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; mode?: ShareMode }) => {
      const updates: any = {
        updated_at: new Date().toISOString(),
      };

      if (data.mode) {
        updates.mode = data.mode;
      }

      const { data: updated, error } = await supabaseClient
        .from('share_links')
        .update(updates)
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: updated.id,
        userId: updated.user_id,
        token: updated.token,
        mode: updated.mode,
        createdAt: updated.created_at,
        revokedAt: updated.revoked_at,
      } as ShareLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share-links'] });
    },
  });
}

// Revoke share link
export function useRevokeShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseClient
        .from('share_links')
        .update({
          revoked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share-links'] });
    },
  });
}
