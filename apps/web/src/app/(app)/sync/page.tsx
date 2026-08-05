"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { useAuth } from "@/providers/AuthProvider";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import * as calendarConnectionsApi from "@/lib/calendar-connections-api";
import type {
  CalendarConnection,
  CalendarProvider,
  ConnectionValidationStatus,
} from "@/lib/calendar-connections-api";
import {
  normalizeAppSpecificPassword,
  statusLabel,
} from "@/lib/calendar-connections-api";

const PROVIDERS: {
  id: CalendarProvider;
  name: string;
  description: string;
  calendarReady: boolean;
}[] = [
  {
    id: "google",
    name: "Google Calendar",
    description: "Events sync two-way with your Google account.",
    calendarReady: true,
  },
  {
    id: "outlook",
    name: "Outlook / Microsoft 365",
    description: "Events sync two-way with Outlook or Microsoft 365.",
    calendarReady: true,
  },
  {
    id: "apple",
    name: "Apple / iCloud Calendar",
    description:
      "CalDAV with Apple ID + app-specific password. Sign in with Apple cannot grant calendar access (Apple limitation).",
    calendarReady: true,
  },
];

function appleEmailFromIdentities(
  identities: Array<{ provider: string; identity_data?: Record<string, unknown> }> | undefined,
  fallbackEmail: string | undefined
): string {
  const apple = identities?.find((i) => i.provider === "apple");
  const fromIdentity = apple?.identity_data?.email;
  if (typeof fromIdentity === "string" && fromIdentity.includes("@")) {
    // Skip Hide My Email relays — CalDAV needs the real Apple ID email
    if (!fromIdentity.toLowerCase().endsWith("@privaterelay.appleid.com")) {
      return fromIdentity;
    }
  }
  if (
    fallbackEmail &&
    fallbackEmail.includes("@") &&
    !fallbackEmail.toLowerCase().endsWith("@privaterelay.appleid.com")
  ) {
    return fallbackEmail;
  }
  return "";
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "Never";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "Never";
  }
}

function statusTone(status: ConnectionValidationStatus): string {
  switch (status) {
    case "valid":
      return "text-[var(--brand-500)]";
    case "expired":
      return "text-[var(--warning)]";
    case "needs_reconnect":
      return "text-[var(--error)]";
    default:
      return "text-[var(--text-secondary)]";
  }
}

export default function SyncPage() {
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [appleAuthLinked, setAppleAuthLinked] = useState(false);
  const [showAppleForm, setShowAppleForm] = useState(false);
  const [appleId, setAppleId] = useState("");
  const [applePassword, setApplePassword] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, loginWithApple } = useAuth();

  const connected = searchParams.get("connected");
  const setup = searchParams.get("setup");
  const err = searchParams.get("error");

  const reload = useCallback(async () => {
    const data = await calendarConnectionsApi.listConnections();
    setConnections(data);
    setError("");
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    reload()
      .catch((e) => {
        if (!cancelled) {
          setConnections([]);
          setError(e instanceof Error ? e.message : "Failed to load sync status");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [connected, reload]);

  useEffect(() => {
    let cancelled = false;
    async function checkAppleIdentity() {
      if (!isAuthenticated) {
        if (!cancelled) setAppleAuthLinked(false);
        return;
      }
      if (!isSupabaseConfigured()) {
        if (!cancelled) setAppleAuthLinked(false);
        return;
      }
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const linked =
        data.user?.identities?.some((i) => i.provider === "apple") ?? false;
      const prefill = appleEmailFromIdentities(
        data.user?.identities as
          | Array<{ provider: string; identity_data?: Record<string, unknown> }>
          | undefined,
        data.user?.email
      );
      if (!cancelled) {
        setAppleAuthLinked(linked);
        if (prefill) {
          setAppleId((prev) => prev || prefill);
        }
      }
    }
    void checkAppleIdentity();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (connected === "apple" && setup === "1") {
      setShowAppleForm(true);
    }
  }, [connected, setup]);

  async function handleConnect(provider: CalendarProvider) {
    setError("");
    setSuccess("");
    if (provider === "apple") {
      setShowAppleForm(true);
      return;
    }
    setActionLoading(provider);
    try {
      const result = await calendarConnectionsApi.getConnectUrl(provider);
      if (result.redirectUrl) window.location.href = result.redirectUrl;
      else setError(result.error || "Could not get connect URL.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connect failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAppleCalDavSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setActionLoading("apple");
    try {
      await calendarConnectionsApi.connectAppleCalDav({
        appleId: appleId.trim(),
        appSpecificPassword: normalizeAppSpecificPassword(applePassword),
      });
      setShowAppleForm(false);
      setApplePassword("");
      await reload();
      setSuccess(
        "iCloud Calendar connected. Events are importing into your DayPilot calendar."
      );
      router.replace("/sync?connected=apple");
    } catch (err) {
      setError(err instanceof Error ? err.message : "iCloud connect failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleLinkAppleSso() {
    setError("");
    setActionLoading("apple-sso");
    try {
      await loginWithApple({ next: "/sync?connected=apple&setup=1" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Apple sign-in failed");
      setActionLoading(null);
    }
  }

  async function handleDisconnect(id: string) {
    setError("");
    setActionLoading(id);
    try {
      await calendarConnectionsApi.disconnectConnection(id);
      setConnections((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Disconnect failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSync(id: string) {
    setError("");
    setActionLoading(`sync-${id}`);
    try {
      await calendarConnectionsApi.syncConnection(id);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleValidate(id: string) {
    setError("");
    setActionLoading(`validate-${id}`);
    try {
      const result = await calendarConnectionsApi.validateConnection(id);
      if (!result.valid) {
        setError(result.error || "Connection needs reconnect.");
      }
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation failed");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">
        Sync
      </h1>
      <p className="text-[var(--text-secondary)] mb-6">
        Connect Google, Outlook, and iCloud. Events merge into one DayPilot
        calendar. Use Validate / Sync now to check tokens and refresh.
      </p>

      {connected && !err && (
        <div className="mb-6 p-4 rounded-xl bg-[color-mix(in_srgb,var(--brand-500)_12%,transparent)] border border-[color-mix(in_srgb,var(--brand-500)_35%,transparent)] text-[var(--text-primary)]">
          {connected === "google" &&
            "Google Calendar connected. Events are syncing."}
          {connected === "outlook" &&
            "Outlook connected. Events are syncing."}
          {connected === "apple" &&
            (setup === "1"
              ? "Enter your Apple ID and app-specific password below to sync iCloud Calendar."
              : "iCloud Calendar connected. Events are syncing.")}
        </div>
      )}
      {err && (
        <div className="mb-6 p-4 rounded-xl bg-[color-mix(in_srgb,var(--error)_12%,transparent)] border border-[color-mix(in_srgb,var(--error)_35%,transparent)] text-[var(--error)]">
          {err === "missing_params" &&
            "Missing OAuth parameters. Try connecting again."}
          {err === "google_callback" && "Google connection failed. Try again."}
          {err === "outlook_callback" &&
            "Outlook connection failed. Try again."}
          {!["missing_params", "google_callback", "outlook_callback"].includes(
            err
          ) && "Something went wrong. Try again."}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-[color-mix(in_srgb,var(--brand-500)_12%,transparent)] border border-[color-mix(in_srgb,var(--brand-500)_35%,transparent)] text-[var(--text-primary)]">
          {success}{" "}
          <Link
            href="/calendar"
            className="text-[var(--brand-500)] font-medium hover:underline"
          >
            Open calendar
          </Link>
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-[color-mix(in_srgb,var(--error)_12%,transparent)] border border-[color-mix(in_srgb,var(--error)_35%,transparent)] text-[var(--error)]">
          {error}
        </div>
      )}

      <div className="glass-effect rounded-2xl p-6 md:p-8 max-w-2xl space-y-4 mb-8">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Apple Sign-In (account)
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Account SSO via Supabase Auth. Linking Apple can prefill your Apple ID
          email for iCloud Calendar — it still cannot sync calendars without an
          app-specific password.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] p-4">
          <div>
            <p className="font-medium text-[var(--text-primary)]">
              Sign in with Apple
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              {appleAuthLinked
                ? "Linked to this DayPilot account."
                : "Not linked — link now, then continue with CalDAV below."}
            </p>
          </div>
          {appleAuthLinked ? (
            <span className="text-sm font-semibold shrink-0 text-[var(--brand-500)]">
              Linked
            </span>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleLinkAppleSso()}
              disabled={!!actionLoading}
            >
              {actionLoading === "apple-sso"
                ? "Redirecting…"
                : "Sign in with Apple"}
            </Button>
          )}
        </div>
      </div>

      <div className="glass-effect rounded-2xl p-6 md:p-8 max-w-2xl space-y-6 mb-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Calendar connection status
          </h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setLoading(true);
              reload()
                .catch((e) =>
                  setError(e instanceof Error ? e.message : "Refresh failed")
                )
                .finally(() => setLoading(false));
            }}
            disabled={loading || !!actionLoading}
          >
            Refresh
          </Button>
        </div>

        {showAppleForm && (
          <form
            onSubmit={handleAppleCalDavSubmit}
            className="rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] p-4 space-y-3"
          >
            <p className="font-medium text-[var(--text-primary)]">
              Connect iCloud Calendar
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              1. Enable 2FA on your Apple ID. 2. Create an{" "}
              <a
                href="https://appleid.apple.com/account/manage"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--brand-500)] hover:underline"
              >
                app-specific password
              </a>{" "}
              at appleid.apple.com (Sign-In and Security). 3. Paste it below.
              Gmail-based Apple IDs (e.g. you@gmail.com) work. Spaces in the
              password are stripped automatically.
            </p>
            <label className="block text-sm text-[var(--text-secondary)]">
              Apple ID email
              <input
                type="email"
                required
                autoComplete="username"
                name="apple-id-caldav"
                placeholder="you@gmail.com or you@icloud.com"
                value={appleId}
                onChange={(e) => setAppleId(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] text-[var(--text-primary)]"
              />
            </label>
            <label className="block text-sm text-[var(--text-secondary)]">
              App-specific password
              <input
                type="password"
                required
                autoComplete="off"
                name="apple-app-specific-password"
                placeholder="xxxx-xxxx-xxxx-xxxx"
                value={applePassword}
                onChange={(e) => setApplePassword(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] text-[var(--text-primary)]"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" disabled={!!actionLoading}>
                {actionLoading === "apple" ? "Connecting…" : "Connect & sync"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowAppleForm(false)}
                disabled={!!actionLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-[var(--text-secondary)]">Loading…</p>
        ) : (
          <ul className="space-y-4">
            {PROVIDERS.map((p) => {
              const conn = connections.find((c) => c.provider === p.id);
              return (
                <li
                  key={p.id}
                  className="rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--text-primary)]">
                        {p.name}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {p.description}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold shrink-0 ${
                        conn
                          ? statusTone(conn.status)
                          : "text-[var(--text-tertiary)]"
                      }`}
                    >
                      {conn ? "Connected" : "Not connected"}
                    </span>
                  </div>

                  {conn ? (
                    <>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div>
                          <dt className="text-[var(--text-tertiary)]">Account</dt>
                          <dd className="text-[var(--text-primary)]">
                            {conn.email || "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[var(--text-tertiary)]">
                            Validation
                          </dt>
                          <dd className={statusTone(conn.status)}>
                            {statusLabel(conn.status)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[var(--text-tertiary)]">
                            Last synced
                          </dt>
                          <dd className="text-[var(--text-primary)]">
                            {formatWhen(conn.syncedAt)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[var(--text-tertiary)]">
                            Last validated
                          </dt>
                          <dd className="text-[var(--text-primary)]">
                            {formatWhen(conn.validatedAt)}
                          </dd>
                        </div>
                      </dl>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleValidate(conn.id)}
                          disabled={!!actionLoading}
                        >
                          {actionLoading === `validate-${conn.id}`
                            ? "Checking…"
                            : "Validate"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSync(conn.id)}
                          disabled={!!actionLoading}
                        >
                          {actionLoading === `sync-${conn.id}`
                            ? "Syncing…"
                            : "Sync now"}
                        </Button>
                        {(conn.status === "needs_reconnect" ||
                          conn.status === "expired" ||
                          p.id === "apple") && (
                          <Button
                            size="sm"
                            onClick={() => handleConnect(p.id)}
                            disabled={!!actionLoading}
                          >
                            Reconnect
                          </Button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDisconnect(conn.id)}
                          disabled={!!actionLoading}
                          className="text-sm text-[var(--error)] hover:underline px-2"
                        >
                          {actionLoading === conn.id
                            ? "Disconnecting…"
                            : "Disconnect"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => handleConnect(p.id)}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === p.id
                        ? "Redirecting…"
                        : p.id === "apple"
                          ? "Connect iCloud"
                          : "Connect"}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-sm text-[var(--text-secondary)]">
        <Link
          href="/calendar"
          className="text-[var(--brand-500)] font-medium hover:underline"
        >
          Calendar
        </Link>
        {" · "}
        <Link
          href="/settings"
          className="text-[var(--brand-500)] font-medium hover:underline"
        >
          Settings
        </Link>
      </p>
    </div>
  );
}
