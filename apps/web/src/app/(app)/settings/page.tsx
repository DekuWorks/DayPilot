"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { Button } from "@/components/Button";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ensureNestSession, normalizeUsername } from "@/lib/supabase/auth";
import { mergeDuplicateAccount } from "@/lib/auth-api";
import { uploadAvatarFile } from "@/lib/avatar-upload";

const MERGE_DONOR_KEY = "daypilot_merge_donor";

export default function SettingsPage() {
  const {
    user,
    refresh,
    loginWithGoogle,
    loginWithMicrosoft,
    loginWithApple,
    deleteAccount,
  } = useAuth();
  const searchParams = useSearchParams();
  const { theme, setLight } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  useEffect(() => {
    if (searchParams.get("merge") !== "1") return;
    let cancelled = false;
    void (async () => {
      const donor = sessionStorage.getItem(MERGE_DONOR_KEY);
      sessionStorage.removeItem(MERGE_DONOR_KEY);
      if (!donor) return;
      const ready = await ensureNestSession({ timeoutMs: 8_000 });
      if (!ready.ok || cancelled) return;
      try {
        const result = await mergeDuplicateAccount(donor);
        if (cancelled) return;
        if (result.merged) {
          setMessage({
            type: "success",
            text: `Moved calendar data from ${result.donorEmail ?? "the other sign-in"} onto this account.`,
          });
        } else {
          setMessage({
            type: "success",
            text: "No second Nest account to merge.",
          });
        }
      } catch (err) {
        if (!cancelled) {
          setMessage({
            type: "error",
            text: err instanceof Error ? err.message : "Merge failed",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  async function startAccountLink(provider: "google" | "microsoft" | "apple") {
    setMessage(null);
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setMessage({ type: "error", text: "Sign in again, then retry." });
      return;
    }
    sessionStorage.setItem(MERGE_DONOR_KEY, token);
    const next = "/settings?merge=1";
    if (provider === "google") await loginWithGoogle({ next });
    else if (provider === "microsoft") await loginWithMicrosoft({ next });
    else await loginWithApple({ next });
  }

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

        <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Light mode
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={theme === "light"}
            onClick={() => setLight(theme !== "light")}
            className={`relative h-7 w-12 rounded-full transition-colors ${
              theme === "light"
                ? "bg-[var(--brand-500)]"
                : "bg-[var(--border-strong)]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
                theme === "light" ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative h-16 w-16 overflow-hidden rounded-full border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--brand-500)_18%,transparent)]"
              aria-label="Change photo"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-lg font-bold text-[var(--brand-500)]">
                  {firstName?.[0]?.toUpperCase() ||
                    user?.email?.[0]?.toUpperCase() ||
                    "?"}
                </span>
              )}
            </button>
            <div>
              <Button
                type="button"
                variant="outline"
                disabled={uploading || !user}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? "Uploading…" : "Change photo"}
              </Button>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                JPEG, PNG or WebP · under 5 MB
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file || !user) return;
                  setUploading(true);
                  setMessage(null);
                  try {
                    const url = await uploadAvatarFile(user.id, file);
                    setAvatarUrl(url);
                    await refresh();
                    setMessage({ type: "success", text: "Photo saved." });
                  } catch (err) {
                    setMessage({
                      type: "error",
                      text:
                        err instanceof Error
                          ? err.message
                          : "Failed to upload photo",
                    });
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </div>
          </div>
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

      <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6 md:p-8 max-w-2xl space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Link a second sign-in
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Sign in with Apple Hide My Email and Google can create two DayPilot
            calendars. Sign in with the other method here. Events move onto the
            account you land on.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => void startAccountLink("google")}
          >
            Link Google
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void startAccountLink("microsoft")}
          >
            Link Microsoft
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void startAccountLink("apple")}
          >
            Link Apple
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6 md:p-8 max-w-2xl space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Sync
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Connect Google, Outlook, or Apple Calendar (iPhone) and keep events
            in sync.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href="/sync"
            className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium bg-[var(--brand-500)] text-[var(--text-inverse)] hover:opacity-90"
          >
            Open Sync
          </a>
        </div>
      </div>

      <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--error)]/40 bg-[var(--surface-primary)] p-6 md:p-8 max-w-2xl space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Delete account
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Permanently delete your DayPilot account, profile, and calendar
            connections. This cannot be undone.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={deleting || !user}
          onClick={() => {
            const ok = window.confirm(
              "Delete your DayPilot account permanently? This cannot be undone.",
            );
            if (!ok) return;
            setDeleting(true);
            setMessage(null);
            void (async () => {
              try {
                await deleteAccount();
                window.location.href = "/login";
              } catch (err) {
                setMessage({
                  type: "error",
                  text:
                    err instanceof Error
                      ? err.message
                      : "Could not delete account",
                });
                setDeleting(false);
              }
            })();
          }}
        >
          {deleting ? "Deleting…" : "Delete account"}
        </Button>
      </div>
    </div>
  );
}
