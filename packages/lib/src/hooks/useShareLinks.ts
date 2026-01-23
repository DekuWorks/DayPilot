import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getShareLinks, saveShareLinks, generateShareToken } from '../storage/localStorage';
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
      const userId = await getCurrentUserId();
      const allLinks = getShareLinks() as ShareLink[];
      // Filter active (not revoked) links for current user
      return allLinks.filter(
        link => link.userId === userId && !link.revokedAt
      );
    },
  });
}

// Get share link by token (for public view)
export function useShareLinkByToken(token: string | null) {
  return useQuery({
    queryKey: ['share-link', token],
    queryFn: async () => {
      if (!token) return null;
      const allLinks = getShareLinks() as ShareLink[];
      const link = allLinks.find(
        l => l.token === token && !l.revokedAt
      );
      return link || null;
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
      const allLinks = getShareLinks() as ShareLink[];
      
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
        saveShareLinks(updated);
        return updated.find(l => l.id === existingLink.id)!;
      }
      
      // Create new link
      const newLink: ShareLink = {
        id: `share-${Date.now()}`,
        userId,
        token: generateShareToken(),
        mode: data.mode,
        createdAt: new Date().toISOString(),
        revokedAt: null,
      };
      
      saveShareLinks([...allLinks, newLink]);
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
      const allLinks = getShareLinks() as ShareLink[];
      const updated = allLinks.map(link =>
        link.id === data.id
          ? { ...link, ...(data.mode && { mode: data.mode }) }
          : link
      );
      saveShareLinks(updated);
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
      const allLinks = getShareLinks() as ShareLink[];
      const updated = allLinks.map(link =>
        link.id === id
          ? { ...link, revokedAt: new Date().toISOString() }
          : link
      );
      saveShareLinks(updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share-links'] });
    },
  });
}
