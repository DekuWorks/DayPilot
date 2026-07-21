"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/Button";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { normalizeUsername } from "@/lib/supabase/auth";

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.avatarUrl) setAvatarUrl(user.avatarUrl);
    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");
    setUsername(user.username || "");
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      if (!user || !isSupabaseConfigured()) {
        throw new Error("Supabase is not configured");
      }
      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();
      const handle = normalizeUsername(username);
      if (!trimmedFirst) throw new Error("First name is required");
      if (username.trim() && handle.length < 3) {
        throw new Error("Username must be at least 3 characters (a-z, 0-9, _)");
      }

      const legalName = [trimmedFirst, trimmedLast].filter(Boolean).join(" ");
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          avatar_url: avatarUrl.trim() || null,
          first_name: trimmedFirst,
          last_name: trimmedLast || null,
          username: handle || null,
          display_name: legalName,
          name: legalName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (error) {
        if (error.code === "23505") {
          throw new Error("That username is already taken");
        }
        throw new Error(error.message);
      }
      await refresh();
      setMessage({ type: "success", text: "Profile updated." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">
        Settings
      </h1>
      <p className="text-[var(--text-secondary)] mb-8">
        Manage your account and profile.
      </p>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6 md:p-8 max-w-2xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
            Account
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">{user?.email}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-[var(--text-primary)] mb-1"
              >
                First name
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Marcus"
                required
                className="w-full px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
              />
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                Used in greetings like “Good morning, Marcus”
              </p>
            </div>
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-[var(--text-primary)] mb-1"
              >
                Last name
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Brown"
                className="w-full px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-[var(--text-primary)] mb-1"
            >
              Username
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
                @
              </span>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                placeholder="deku"
                autoComplete="username"
                className="w-full pl-8 pr-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
              />
            </div>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              Your public handle — separate from your real name
            </p>
          </div>

          <div>
            <label
              htmlFor="avatarUrl"
              className="block text-sm font-medium text-[var(--text-primary)] mb-1"
            >
              Profile image URL
            </label>
            <input
              id="avatarUrl"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/your-photo.jpg"
              className="w-full px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
            />
          </div>
          {message && (
            <p
              className={`text-sm ${
                message.type === "success"
                  ? "text-[var(--success)]"
                  : "text-[var(--error)]"
              }`}
            >
              {message.text}
            </p>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </form>
      </div>

      <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6 md:p-8 max-w-2xl space-y-3">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Connected accounts
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Google sign-in and Google Calendar sync need OAuth credentials from
          Google Cloud. Sign-in is configured in Supabase Auth; calendar sync
          uses the Nest API.
        </p>
        <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
          <li>
            <span className="font-medium text-[var(--text-primary)]">
              Sign in with Google
            </span>
            {" — "}
            enable the Google provider in Supabase Auth (see{" "}
            <code className="text-xs bg-[var(--surface-secondary)] px-1 rounded">
              docs/GOOGLE_AUTH_SETUP.md
            </code>
            ).
          </li>
          <li>
            <span className="font-medium text-[var(--text-primary)]">
              Google Calendar
            </span>
            {" — "}
            set <code className="text-xs bg-[var(--surface-secondary)] px-1 rounded">GOOGLE_CLIENT_ID</code> /{" "}
            <code className="text-xs bg-[var(--surface-secondary)] px-1 rounded">SECRET</code> on the API, then connect from{" "}
            <a href="/integrations" className="text-[var(--brand-500)] hover:underline">
              Integrations
            </a>
            .
          </li>
        </ul>
      </div>
    </div>
  );
}
