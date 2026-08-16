import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  DEFAULT_WORKSPACE_SEEDS,
  firstFreeWorkspaceColor,
  isWorkspaceColorTaken,
  normalizeColorHex,
} from "./workspace-colors";

export type Workspace = {
  id: string;
  name: string;
  color: string;
  type: string;
};

type WorkspaceRow = {
  id: string;
  name: string;
  color: string;
  type: string | null;
};

function mapRow(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    color: normalizeColorHex(row.color) ?? row.color,
    type: row.type ?? "other",
  };
}

async function listOwned(userId: string): Promise<Workspace[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("id, name, color, type")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data as WorkspaceRow[]) ?? []).map(mapRow);
}

/** Load workspaces and seed the default four if this account has none of that type. */
export async function listAndEnsureWorkspaces(userId: string): Promise<Workspace[]> {
  if (!isSupabaseConfigured()) return [];
  let rows = await listOwned(userId);
  const supabase = createClient();

  for (const seed of DEFAULT_WORKSPACE_SEEDS) {
    const exists = rows.some(
      (r) => r.type === seed.type || r.name.toLowerCase() === seed.name.toLowerCase()
    );
    if (exists) continue;
    const color = isWorkspaceColorTaken(seed.color, rows)
      ? firstFreeWorkspaceColor(rows)
      : seed.color;
    const { data: created, error } = await supabase
      .from("workspaces")
      .insert({
        owner_id: userId,
        name: seed.name,
        color,
        type: seed.type,
      })
      .select("id, name, color, type")
      .single();
    if (error || !created) continue;
    const mapped = mapRow(created as WorkspaceRow);
    rows = [...rows, mapped];
    await supabase.from("workspace_members").insert({
      workspace_id: mapped.id,
      user_id: userId,
      role: "owner",
      status: "active",
    });
  }

  return rows;
}

export async function updateWorkspaceColor(
  workspaceId: string,
  color: string,
  workspaces: Workspace[]
): Promise<Workspace> {
  const hex = normalizeColorHex(color);
  if (!hex) throw new Error("Invalid colour");
  if (isWorkspaceColorTaken(hex, workspaces, workspaceId)) {
    throw new Error("That colour is already used by another workspace");
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workspaces")
    .update({ color: hex, updated_at: new Date().toISOString() })
    .eq("id", workspaceId)
    .select("id, name, color, type")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update workspace colour");
  }
  return mapRow(data as WorkspaceRow);
}
