import { createClient } from "@/lib/supabase/client";

export type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: Row): Contact {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT =
  "id, name, email, phone, company, notes, created_at, updated_at";

export async function listContacts(): Promise<Contact[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select(SELECT)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map(mapRow);
}

export async function createContact(
  userId: string,
  data: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    notes?: string;
  }
): Promise<Contact> {
  const supabase = createClient();
  const { data: row, error } = await supabase
    .from("contacts")
    .insert({
      user_id: userId,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      company: data.company || null,
      notes: data.notes || null,
    })
    .select(SELECT)
    .single();
  if (error || !row) throw new Error(error?.message ?? "Failed to create contact");
  return mapRow(row as Row);
}

export async function updateContact(
  id: string,
  patch: Partial<{
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    notes: string | null;
  }>
): Promise<Contact> {
  const supabase = createClient();
  const { data: row, error } = await supabase
    .from("contacts")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(SELECT)
    .single();
  if (error || !row) throw new Error(error?.message ?? "Failed to update contact");
  return mapRow(row as Row);
}

export async function deleteContact(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
