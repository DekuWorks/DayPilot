"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import * as calendarConnectionsApi from "@/lib/calendar-connections-api";
import type {
  CalendarConnection,
  CalendarProvider,
  ConnectionValidationStatus,
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
  {
    id: "apple",
    name: "Apple / iCloud",
    description: "Apple Calendar connection (setup coming soon).",
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const connected = searchParams.get("connected");
  const setup = searchParams.get("setup");
  const err = searchParams.get("error");

  const reload = useCallback(async () => {
    const data = await calendarConnectionsApi.listConnections();
    setConnections(data);
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

  async function handleConnect(provider: CalendarProvider) {
    setError("");
    setActionLoading(provider);
    try {
      const { redirectUrl } = await calendarConnectionsApi.getConnectUrl(provider);
      if (redirectUrl) window.location.href = redirectUrl;
      else setError("Could not get connect URL.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connect failed");
    } finally {
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
        See which calendars are connected, when they last synced, and whether
        the connection is still valid.
      </p>

      {connected && !err && (
        <div className="mb-6 p-4 rounded-xl bg-[color-mix(in_srgb,var(--brand-500)_12%,transparent)] border border-[color-mix(in_srgb,var(--brand-500)_35%,transparent)] text-[var(--text-primary)]">
          {connected === "google" &&
            "Google Calendar connected. Events are syncing."}
          {connected === "outlook" &&
            "Outlook connected. Events are syncing."}
          {connected === "apple" &&
            setup === "1" &&
            "Apple / iCloud setup is coming soon."}
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
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-[color-mix(in_srgb,var(--error)_12%,transparent)] border border-[color-mix(in_srgb,var(--error)_35%,transparent)] text-[var(--error)]">
          {error}
        </div>
      )}

      <div className="glass-effect rounded-2xl p-6 md:p-8 max-w-2xl space-y-6 mb-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Connection status
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
                          conn.status === "expired") && (
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
        Prefer the longer setup guide?{" "}
        <Link
          href="/integrations"
          className="text-[var(--brand-500)] font-medium hover:underline"
        >
          Integrations
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
