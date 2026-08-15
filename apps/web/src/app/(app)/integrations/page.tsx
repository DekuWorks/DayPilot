"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import {
  SsoBrandButton,
  ssoBrandForProvider,
  ssoConnectLabel,
} from "@/components/SsoButtons";
import * as calendarConnectionsApi from "@/lib/calendar-connections-api";
import type {
  CalendarConnection,
  EventKitConnectionStatus,
} from "@/lib/calendar-connections-api";
import {
  buildCalendarProviderRows,
  latestSyncAt,
  providerTitle,
  syncAllHint,
  toneClass,
  type CalendarProviderUi,
} from "@/lib/calendar-connection-ui";

const DEEP_LINK = "com.daypilot.daypilot://integrations/apple-calendar";

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "Never";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "Never";
  }
}

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [eventKit, setEventKit] = useState<EventKitConnectionStatus | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const searchParams = useSearchParams();

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
          setError(
            e instanceof Error ? e.message : "Failed to load connections"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [connected, reload]);

  const rows = buildCalendarProviderRows({
    connections,
    eventKitStatus: eventKit,
  });
  const hint = syncAllHint(rows);
  const latest = latestSyncAt(rows);
  const busy = !!actionLoading;

  async function handleConnect(provider: CalendarProviderUi["id"]) {
    if (provider === "apple") return;
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

  async function handleDisconnect(id: string) {
    setError("");
    setActionLoading(id);
    try {
      await calendarConnectionsApi.disconnectConnection(id);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Disconnect failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSyncAll() {
    setError("");
    setActionLoading("sync-all");
    try {
      const apple = rows.find((r) => r.id === "apple");
      const count = await calendarConnectionsApi.syncAllConnections({
        connections,
        eventKitConnectionId: apple?.canSync ? apple.connectionId : null,
      });
      await reload();
      if (count === 0) {
        setError("Nothing to sync. Connect a calendar or reconnect first.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">
        Connected calendars
      </h1>
      <p className="text-[var(--text-secondary)] mb-6">
        Google, Outlook, and Apple Calendar (EventKit on iPhone). Sign in with
        Apple is account login only — it is not a calendar connection.
      </p>

      {connected && !err && (
        <div className="mb-6 p-4 rounded-xl bg-[color-mix(in_srgb,var(--brand-500)_12%,transparent)] border border-[color-mix(in_srgb,var(--brand-500)_35%,transparent)] text-[var(--text-primary)]">
          {connected === "google" &&
            "Google Calendar connected. Events are syncing to your calendar."}
          {connected === "outlook" &&
            "Outlook connected. Events are syncing to your calendar."}
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

      <div className="glass-effect rounded-2xl p-6 md:p-8 max-w-2xl space-y-6">
        <div>
          <Button
            onClick={() => void handleSyncAll()}
            disabled={loading || busy}
          >
            {actionLoading === "sync-all" ? "Syncing…" : "Sync all"}
          </Button>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {hint === "needsReconnect" && "Needs reconnect"}
            {hint === "lastSynced" && `Last synced ${formatWhen(latest)}`}
            {hint === "neverSynced" && "Never synced"}
            {hint === "noneConnected" && "Connect a calendar to sync"}
          </p>
        </div>

        {loading ? (
          <p className="text-[var(--text-secondary)]">Loading…</p>
        ) : (
          <ul className="space-y-4">
            {rows.map((row) => (
              <li
                key={row.id}
                className="rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] p-4 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--text-primary)]">
                      {providerTitle(row.id)}
                    </p>
                    {row.detail ? (
                      <p className="text-sm text-[var(--text-secondary)]">
                        {row.detail}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`text-sm font-semibold shrink-0 ${toneClass(row.tone)}`}
                  >
                    {row.headline}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {row.tone === "notConnected" &&
                  row.id !== "apple" &&
                  ssoBrandForProvider(row.id) ? (
                    <div className="w-full max-w-xs">
                      <SsoBrandButton
                        brand={ssoBrandForProvider(row.id)!}
                        label={
                          actionLoading === row.id
                            ? "Redirecting…"
                            : ssoConnectLabel(row.id, false)
                        }
                        busy={actionLoading === row.id}
                        disabled={busy}
                        onClick={() => void handleConnect(row.id)}
                      />
                    </div>
                  ) : null}
                  {row.tone === "notConnected" && row.id === "apple" ? (
                    <Link
                      href="/app/integrations/apple-calendar"
                      className="inline-flex items-center rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--brand-500)] hover:underline"
                    >
                      Set up on iPhone
                    </Link>
                  ) : null}
                  {row.canReconnect && ssoBrandForProvider(row.id) ? (
                    <div className="w-full max-w-xs">
                      <SsoBrandButton
                        brand={ssoBrandForProvider(row.id)!}
                        label={ssoConnectLabel(row.id, true)}
                        disabled={busy}
                        onClick={() => void handleConnect(row.id)}
                      />
                    </div>
                  ) : null}
                  {row.id === "apple" && row.tone === "healthy" ? (
                    <a
                      href={DEEP_LINK}
                      className="inline-flex items-center rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--brand-500)] hover:underline"
                    >
                      Manage on iPhone
                    </a>
                  ) : null}
                  {row.id !== "apple" && row.connectionId ? (
                    <button
                      type="button"
                      onClick={() => void handleDisconnect(row.connectionId!)}
                      disabled={busy}
                      className="text-sm text-[var(--error)] hover:underline"
                    >
                      {actionLoading === row.connectionId
                        ? "Disconnecting…"
                        : "Disconnect"}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-6">
        <Link
          href="/sync"
          className="text-[var(--brand-500)] font-medium hover:underline"
        >
          Open Sync
        </Link>
        {" · "}
        <Link
          href="/dashboard"
          className="text-[var(--brand-500)] font-medium hover:underline"
        >
          ← Back to Calendar
        </Link>
      </p>
    </div>
  );
}
