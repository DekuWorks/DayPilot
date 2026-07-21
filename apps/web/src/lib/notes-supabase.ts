import { createClient } from "@/lib/supabase/client";

export type Note = {
  id: string;
  title: string;
  content: string;
  contentFormat: string;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

type NoteRow = {
  id: string;
  title: string;
  content: string;
  content_format: string;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

function mapRow(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    contentFormat: row.content_format,
    projectId: row.project_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

export async function listNotes(): Promise<Note[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notes")
    .select(
      "id, title, content, content_format, project_id, created_at, updated_at, archived_at"
    )
    .is("archived_at", null)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data as NoteRow[]) ?? []).map(mapRow);
}

export async function createNote(
  userId: string,
  data: { title?: string; content?: string } = {}
): Promise<Note> {
  const supabase = createClient();
  const { data: row, error } = await supabase
    .from("notes")
    .insert({
      user_id: userId,
      title: data.title ?? "Untitled",
      content: data.content ?? "",
      content_format: "markdown",
    })
    .select(
      "id, title, content, content_format, project_id, created_at, updated_at, archived_at"
    )
    .single();
  if (error || !row) throw new Error(error?.message ?? "Failed to create note");
  return mapRow(row as NoteRow);
}

export async function updateNote(
  id: string,
  patch: { title?: string; content?: string }
): Promise<Note> {
  const supabase = createClient();
  const { data: row, error } = await supabase
    .from("notes")
    .update({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.content !== undefined ? { content: patch.content } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(
      "id, title, content, content_format, project_id, created_at, updated_at, archived_at"
    )
    .single();
  if (error || !row) throw new Error(error?.message ?? "Failed to update note");
  return mapRow(row as NoteRow);
}

export async function archiveNote(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("notes")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
