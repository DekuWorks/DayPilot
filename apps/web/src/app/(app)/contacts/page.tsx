"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { useAuth } from "@/providers/AuthProvider";
import * as contactsApi from "@/lib/contacts-supabase";
import type { Contact } from "@/lib/contacts-supabase";

export default function ContactsPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");

  const selected = contacts.find((c) => c.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await contactsApi.listContacts();
      setContacts(list);
      setSelectedId((prev) => {
        if (prev && list.some((c) => c.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q)
    );
  }, [contacts, query]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim()) return;
    try {
      const contact = await contactsApi.createContact(user.id, {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
      });
      setContacts((prev) =>
        [...prev, contact].sort((a, b) => a.name.localeCompare(b.name))
      );
      setSelectedId(contact.id);
      setCreating(false);
      setName("");
      setEmail("");
      setPhone("");
      setCompany("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    }
  }

  async function patchSelected(
    patch: Parameters<typeof contactsApi.updateContact>[1]
  ) {
    if (!selectedId) return;
    try {
      const updated = await contactsApi.updateContact(selectedId, patch);
      setContacts((prev) =>
        prev
          .map((c) => (c.id === updated.id ? updated : c))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  }

  async function handleDelete() {
    if (!selectedId || !confirm("Delete this contact?")) return;
    try {
      await contactsApi.deleteContact(selectedId);
      setContacts((prev) => prev.filter((c) => c.id !== selectedId));
      setSelectedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Contacts
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            People you work and meet with.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          Add contact
        </Button>
      </div>

      {error && <p className="text-sm text-[var(--error)]">{error}</p>}

      {creating && (
        <form
          onSubmit={handleCreate}
          className="grid gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 sm:grid-cols-2"
        >
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)] sm:col-span-2"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
          />
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company"
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)] sm:col-span-2"
          />
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreating(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save
            </Button>
          </div>
        </form>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts…"
            className="mb-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
          />
          <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
            {loading ? (
              <li className="p-2 text-sm text-[var(--text-tertiary)]">
                Loading…
              </li>
            ) : filtered.length === 0 ? (
              <li className="p-2 text-sm text-[var(--text-tertiary)]">
                No contacts yet.
              </li>
            ) : (
              filtered.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full rounded-xl px-3 py-2.5 text-left ${
                      selectedId === c.id
                        ? "bg-[color-mix(in_srgb,var(--brand-500)_12%,transparent)]"
                        : "hover:bg-[var(--surface-secondary)]"
                    }`}
                  >
                    <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">
                      {c.name}
                    </span>
                    <span className="block truncate text-xs text-[var(--text-tertiary)]">
                      {c.company || c.email || "—"}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
          {!selected ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Select a contact to view details.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <input
                  value={selected.name}
                  onChange={(e) =>
                    setContacts((prev) =>
                      prev.map((c) =>
                        c.id === selected.id
                          ? { ...c, name: e.target.value }
                          : c
                      )
                    )
                  }
                  onBlur={(e) =>
                    patchSelected({
                      name: e.target.value.trim() || selected.name,
                    })
                  }
                  className="min-w-0 flex-1 bg-transparent text-xl font-bold text-[var(--text-primary)] outline-none"
                />
                <Button variant="outline" size="sm" onClick={handleDelete}>
                  Delete
                </Button>
              </div>
              {(
                [
                  ["email", "Email", selected.email ?? ""],
                  ["phone", "Phone", selected.phone ?? ""],
                  ["company", "Company", selected.company ?? ""],
                  ["notes", "Notes", selected.notes ?? ""],
                ] as const
              ).map(([key, label, value]) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                    {label}
                  </label>
                  {key === "notes" ? (
                    <textarea
                      value={value}
                      rows={3}
                      onChange={(e) =>
                        setContacts((prev) =>
                          prev.map((c) =>
                            c.id === selected.id
                              ? { ...c, notes: e.target.value }
                              : c
                          )
                        )
                      }
                      onBlur={(e) =>
                        patchSelected({
                          notes: e.target.value.trim() || null,
                        })
                      }
                      className="w-full resize-none rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
                    />
                  ) : (
                    <input
                      value={value}
                      onChange={(e) =>
                        setContacts((prev) =>
                          prev.map((c) =>
                            c.id === selected.id
                              ? { ...c, [key]: e.target.value }
                              : c
                          )
                        )
                      }
                      onBlur={(e) =>
                        patchSelected({
                          [key]: e.target.value.trim() || null,
                        })
                      }
                      className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
