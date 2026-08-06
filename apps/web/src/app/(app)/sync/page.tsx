"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { useAuth } from "@/providers/AuthProvider";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import * as calendarConnectionsApi from "@/lib/calendar-connections-api";
import type {
  CalendarConnection,
  CalendarProvider,
  ConnectionValidationStatus,
  EventKitConnectionStatus,
} from "@/lib/calendar-connections-api";
import { statusLabel } from "@/lib/calendar-connections-api";

const PROVIDERS: {
  id: CalendarProvider;
  name: string;
  description: string;
}[] = [
  {
    id: "google",
    name: "Google Calendar",
    description: "Events sync two-way with your Google account.",
  },
  {
    id: "outlook",
    name: "Outlook / Microsoft 365",
    description: "Events sync two-way with Outlook or Microsoft 365.",
  },
];

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
  const [eventKit, setEventKit] = useState<EventKitConnectionStatus | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [appleAuthLinked, setAppleAuthLinked] = useState(false);
  const searchParams = useSearchParams();
  const { isAuthenticated, loginWithApple } = useAuth();

  const connected = searchParams.get("connected");
  const err = searchParams.get("error");

  const reload = useCallback(async () => {
    const [data, ek] = await Promise.all([
      calendarConnectionsApi.listConnections(),
      calendarConnectionsApi.getEventKitStatus().catch(() => null),
    ]);
    setConnections(data);
    setEventKit(ek);
    setError("");
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
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
      if (!isAuthenticated || !isSupabaseConfigured()) {
        if (!cancelled) setAppleAuthLinked(false);
        return;
      }
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const linked =
        data.user?.identities?.some((i) => i.provider === "apple") ?? false;
      if (!cancelled) setAppleAuthLinked(linked);
    }
    void checkAppleIdentity();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  async function handleConnect(provider: CalendarProvider) {
    setError("");
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

  async function handleLinkAppleAccount() {
    setError("");
    setActionLoading("apple-sso");
    try {
      await loginWithApple({ next: "/sync" });
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

  const ekConn = eventKit?.connections?.[0];
  const ekConnected = !!ekConn && ekConn.calendarStatus === "connected";
  const selectedCount =
    ekConn?.calendars?.filter((c) => c.isSelected).length ?? 0;
  const deepLink = "com.daypilot.daypilot://integrations/apple-calendar";
  const universalLink =
    "https://www.daypilot.co/app/integrations/apple-calendar";

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">
        Sync
      </h1>
      <p className="text-[var(--text-secondary)] mb-6">
        Connect Google and Outlook. Apple Calendar syncs through the DayPilot
        iOS app (EventKit) — no Apple ID password on the web.
      </p>

      {connected && !err && (
        <div className="mb-6 p-4 rounded-xl bg-[color-mix(in_srgb,var(--brand-500)_12%,transparent)] border border-[color-mix(in_srgb,var(--brand-500)_35%,transparent)] text-[var(--text-primary)]">
          {connected === "google" &&
            "Google Calendar connected. Events are syncing."}
          {connected === "outlook" &&
            "Outlook connected. Events are syncing."}
        </div>
      )}
      {err && (
        <div className="mb-6 p-4 rounded-xl bg-[color-mix(in_srgb,var(--error)_12%,transparent)] border border-[color-mix(in_srgb,var(--error)_35%,transparent)] text-[var(--error)]">
          Something went wrong. Try again.
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-[color-mix(in_srgb,var(--error)_12%,transparent)] border border-[color-mix(in_srgb,var(--error)_35%,transparent)] text-[var(--error)]">
          {error}
        </div>
      )}

      <div className="glass-effect rounded-2xl p-6 md:p-8 max-w-2xl space-y-4 mb-8">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Apple
        </h2>

        <div className="rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] p-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-[var(--text-primary)]">
                Apple Account
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                Sign in with Apple for your DayPilot account. This does not grant
                calendar access.
              </p>
            </div>
            {appleAuthLinked ? (
              <span className="text-sm font-semibold text-[var(--brand-500)]">
                Connected
              </span>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleLinkAppleAccount()}
                disabled={!!actionLoading}
              >
                {actionLoading === "apple-sso" ? "Redirecting…" : "Sign in with Apple"}
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium text-[var(--text-primary)]">
                Apple Calendar
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {ekConnected
                  ? `Connected through ${ekConn?.displayName || "iPhone"}`
                  : "Setup required — enable calendar access in the DayPilot iOS app."}
              </p>
            </div>
            <span
              className={`text-sm font-semibold shrink-0 ${
                ekConnected
                  ? "text-[var(--brand-500)]"
                  : "text-[var(--warning)]"
              }`}
            >
              {ekConnected ? "Connected through iPhone" : "Setup required"}
            </span>
          </div>
          {ekConnected ? (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-[var(--text-tertiary)]">Calendars</dt>
                <dd className="text-[var(--text-primary)]">
                  {selectedCount} selected
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-tertiary)]">Last synced</dt>
                <dd className="text-[var(--text-primary)]">
                  {formatWhen(ekConn?.lastSyncedAt)}
                </dd>
              </div>
            </dl>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-[var(--text-secondary)]">
                Open DayPilot on your iPhone to allow calendar access. iCloud
                events then appear here automatically (read-only on web).
              </p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Continue setup on iPhone
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={deepLink}
                  className="inline-flex items-center rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--brand-500)] hover:underline"
                >
                  Open in DayPilot app
                </a>
                <Link
                  href="/app/integrations/apple-calendar"
                  className="inline-flex items-center rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--brand-500)] hover:underline"
                >
                  Setup instructions
                </Link>
              </div>
              <p className="text-xs text-[var(--text-tertiary)] break-all">
                Deep link: {deepLink}
                <br />
                Universal: {universalLink}
              </p>
            </div>
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
                      {actionLoading === p.id ? "Redirecting…" : "Connect"}
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
