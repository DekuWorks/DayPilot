"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import {
  listAndEnsureWorkspaces,
  updateWorkspaceColor,
  type Workspace,
} from "@/lib/workspaces-supabase";
import { defaultWorkspaces } from "@/components/shell/nav-config";
import { normalizeColorHex } from "@/lib/workspace-colors";

function fallbackWorkspaces(): Workspace[] {
  return defaultWorkspaces.map((ws) => ({
    id: ws.id,
    name: ws.name,
    color: normalizeColorHex(ws.color) ?? ws.color,
    type: ws.id,
  }));
}

export function useWorkspaces() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>(fallbackWorkspaces);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user?.id) {
      setWorkspaces([]);
      setLoading(false);
      return;
    }
    try {
      const rows = await listAndEnsureWorkspaces(user.id);
      setWorkspaces(rows.length > 0 ? rows : fallbackWorkspaces());
    } catch {
      setWorkspaces(fallbackWorkspaces());
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setColor = useCallback(
    async (workspaceId: string, color: string) => {
      const updated = await updateWorkspaceColor(workspaceId, color, workspaces);
      setWorkspaces((prev) =>
        prev.map((ws) => (ws.id === updated.id ? updated : ws))
      );
      return updated;
    },
    [workspaces]
  );

  return { workspaces, loading, reload, setColor };
}
