"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/Button";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (user?.avatarUrl) setAvatarUrl(user.avatarUrl);
    if (user) {
      setDisplayName(
        [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
      );
    }
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      if (!user || !isSupabaseConfigured()) {
        throw new Error("Supabase is not configured");
      }
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          avatar_url: avatarUrl.trim() || null,
          display_name: displayName.trim() || null,
          name: displayName.trim() || null,
        })
        .eq("id", user.id);
      if (error) throw new Error(error.message);
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
          <div>
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-[var(--text-primary)] mb-1"
            >
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
            />
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
    </div>
  );
}
