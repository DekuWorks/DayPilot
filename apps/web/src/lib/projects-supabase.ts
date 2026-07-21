import { createClient } from "@/lib/supabase/client";

export type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  color: string;
  progress: number;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  color: string;
  progress: number | null;
  due_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    color: row.color,
    progress: Number(row.progress ?? 0),
    dueAt: row.due_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listProjects(): Promise<Project[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, name, description, status, color, progress, due_at, created_at, updated_at"
    )
    .neq("status", "archived")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data as ProjectRow[]) ?? []).map(mapRow);
}

export async function createProject(
  userId: string,
  data: { name: string; description?: string; color?: string }
): Promise<Project> {
  const supabase = createClient();
  const { data: row, error } = await supabase
    .from("projects")
    .insert({
      owner_id: userId,
      name: data.name,
      description: data.description ?? null,
      color: data.color ?? "#42E85F",
      status: "active",
    })
    .select(
      "id, name, description, status, color, progress, due_at, created_at, updated_at"
    )
    .single();
  if (error || !row)
    throw new Error(error?.message ?? "Failed to create project");
  return mapRow(row as ProjectRow);
}

export async function updateProject(
  id: string,
  patch: Partial<{
    name: string;
    description: string | null;
    status: string;
    color: string;
    progress: number;
  }>
): Promise<Project> {
  const supabase = createClient();
  const { data: row, error } = await supabase
    .from("projects")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(
      "id, name, description, status, color, progress, due_at, created_at, updated_at"
    )
    .single();
  if (error || !row)
    throw new Error(error?.message ?? "Failed to update project");
  return mapRow(row as ProjectRow);
}

export async function archiveProject(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("projects")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
