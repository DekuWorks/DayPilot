import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getShareLinks, saveShareLinks, generateShareToken } from '../storage/storageAdapter';
import type { ShareLink, ShareMode } from '@daypilot/types';
import { supabaseClient } from '../supabaseClient';

// Get current user ID (for localStorage MVP)
async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabaseClient.auth.getUser();
  return user?.id || 'local-user';
}

// Fetch user's share links
export function useShareLinks() {
  return useQuery({
    queryKey: ['share-links'],
    queryFn: async () => {
      const allLinks = await getShareLinks();
      // Filter active (not revoked) links
      return allLinks.filter(link => !link.revokedAt);
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
      const allLinks = await getShareLinks();
      
      // Check if user already has an active link
      const existingLink = allLinks.find(
        link => link.userId === userId && !link.revokedAt
      );
      
      if (existingLink) {
        // Update existing link
        const updated = allLinks.map(link =>
          link.id === existingLink.id
            ? { ...link, mode: data.mode, revokedAt: null }
            : link
        );
        await saveShareLinks(updated);
        return updated.find(l => l.id === existingLink.id)!;
      }
      
      // Create new link
      const token = await generateShareToken();
      const newLink: ShareLink = {
        id: `share-${Date.now()}`,
        userId,
        token,
        mode: data.mode,
        createdAt: new Date().toISOString(),
        revokedAt: null,
      };
      
      await saveShareLinks([...allLinks, newLink]);
      return newLink;
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
      const allLinks = await getShareLinks();
      const updated = allLinks.map(link =>
        link.id === data.id
          ? { ...link, ...(data.mode && { mode: data.mode }) }
          : link
      );
      await saveShareLinks(updated);
      return updated.find(l => l.id === data.id)!;
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
      const allLinks = await getShareLinks();
      const updated = allLinks.map(link =>
        link.id === id
          ? { ...link, revokedAt: new Date().toISOString() }
          : link
      );
      await saveShareLinks(updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share-links'] });
    },
  });
}
