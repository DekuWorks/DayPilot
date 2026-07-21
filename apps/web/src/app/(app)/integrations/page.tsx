"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import * as calendarConnectionsApi from "@/lib/calendar-connections-api";
import type { CalendarConnection } from "@/lib/calendar-connections-api";

const PROVIDERS: { id: CalendarConnection["provider"]; name: string; description: string }[] = [
  { id: "google", name: "Google Calendar", description: "Sync events from your Google account." },
  { id: "outlook", name: "Outlook / Microsoft 365", description: "Sync events from Outlook or Microsoft 365." },
  { id: "apple", name: "Apple / iCloud", description: "Connect your Apple or iCloud calendar (setup coming soon)." },
];

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const connected = searchParams.get("connected");
  const setup = searchParams.get("setup");
  const err = searchParams.get("error");

  useEffect(() => {
    let cancelled = false;
    calendarConnectionsApi
      .listConnections()
      .then((data) => {
        if (!cancelled) setConnections(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setConnections([]);
          setError(e instanceof Error ? e.message : "Failed to load connections");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [connected]);

  async function handleConnect(provider: CalendarConnection["provider"]) {
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
      setConnections((prev) => prev.map((c) => (c.id === id ? { ...c, syncedAt: new Date().toISOString() } : c)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">Connected calendars</h1>
      <p className="text-[var(--text-secondary)] mb-6">
        Link Google, Outlook, or Apple/iCloud so all your events appear in one calendar.
        Edits and deletes in DayPilot sync back to Google and Outlook.
      </p>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        First-time setup: add OAuth credentials to the API <code className="text-xs bg-[var(--surface-secondary)] px-1 rounded">.env</code> — see{" "}
        <code className="text-xs bg-[var(--surface-secondary)] px-1 rounded">docs/CALENDAR_INTEGRATIONS_SETUP.md</code>.
        If Outlook was connected before write access was enabled, disconnect and reconnect.
      </p>

      {connected && !err && (
        <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-800">
          {connected === "google" && "Google Calendar connected. Events are syncing to your calendar."}
          {connected === "outlook" && "Outlook connected. Events are syncing to your calendar."}
          {connected === "apple" && setup === "1" && "Apple / iCloud setup is coming soon."}
        </div>
      )}
      {err && (
        <div className="mb-6 p-4 rounded-xl bg-[color-mix(in_srgb,var(--error)_12%,transparent)] border border-[color-mix(in_srgb,var(--error)_35%,transparent)] text-[var(--error)]">
          {err === "missing_params" && "Missing OAuth parameters. Try connecting again."}
          {err === "google_callback" && "Google connection failed. Try again."}
          {err === "outlook_callback" && "Outlook connection failed. Try again."}
          {!["missing_params", "google_callback", "outlook_callback"].includes(err) && "Something went wrong. Try again."}
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-[color-mix(in_srgb,var(--error)_12%,transparent)] border border-[color-mix(in_srgb,var(--error)_35%,transparent)] text-[var(--error)]">{error}</div>
      )}

      <div className="glass-effect rounded-2xl p-6 md:p-8 max-w-2xl space-y-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Your connections</h2>
        {loading ? (
          <p className="text-[var(--text-secondary)]">Loading…</p>
        ) : connections.length === 0 ? (
          <p className="text-[var(--text-secondary)]">No calendars connected yet. Connect one below.</p>
        ) : (
          <ul className="space-y-3">
            {connections.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-3 py-3 px-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)]"
              >
                <span className="font-medium text-[var(--text-primary)] capitalize">{c.provider}</span>
                <span className="text-[var(--text-secondary)] text-sm">{c.email}</span>
                {c.syncedAt && (
                  <span className="text-xs text-[var(--text-secondary)]">
                    Synced {new Date(c.syncedAt).toLocaleString()}
                  </span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSync(c.id)}
                  disabled={!!actionLoading}
                >
                  {actionLoading === `sync-${c.id}` ? "Syncing…" : "Sync now"}
                </Button>
                <button
                  type="button"
                  onClick={() => handleDisconnect(c.id)}
                  disabled={!!actionLoading}
                  className="text-sm text-[var(--error)] hover:underline"
                >
                  {actionLoading === c.id ? "Disconnecting…" : "Disconnect"}
                </button>
              </li>
            ))}
          </ul>
        )}

        <h2 className="text-lg font-semibold text-[var(--text-primary)] pt-4">Add a calendar</h2>
        <ul className="space-y-4">
          {PROVIDERS.map((p) => {
            const isConnected = connections.some((c) => c.provider === p.id);
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-4 py-4 px-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)]"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--text-primary)]">{p.name}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{p.description}</p>
                </div>
                {isConnected ? (
                  <span className="text-sm text-[var(--brand-500)] font-medium">Connected</span>
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
      </div>

      <p className="mt-6">
        <Link href="/dashboard" className="text-[var(--brand-500)] font-medium hover:underline">← Back to Calendar</Link>
      </p>
    </div>
  );
}
