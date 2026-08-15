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

export default function SyncPage() {
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
        Sync
      </h1>
      <p className="text-[var(--text-secondary)] mb-6">
        One status per calendar. Apple Calendar syncs through the DayPilot iOS
        app (EventKit) — manage it on iPhone.
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

      <div className="glass-effect rounded-2xl p-6 md:p-8 max-w-2xl space-y-6 mb-8">
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
              <ProviderCard
                key={row.id}
                row={row}
                busy={busy}
                connecting={actionLoading === row.id}
                disconnecting={actionLoading === (row.connectionId ?? row.id)}
                onConnect={() => void handleConnect(row.id)}
                onReconnect={
                  row.canReconnect ? () => void handleConnect(row.id) : undefined
                }
                onDisconnect={
                  row.id !== "apple" && row.connectionId
                    ? () => void handleDisconnect(row.connectionId!)
                    : undefined
                }
              />
            ))}
          </ul>
        )}
      </div>

      <p className="text-sm text-[var(--text-secondary)]">
        <Link
          href="/dashboard"
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

function ProviderCard({
  row,
  busy,
  connecting,
  disconnecting,
  onConnect,
  onReconnect,
  onDisconnect,
}: {
  row: CalendarProviderUi;
  busy: boolean;
  connecting: boolean;
  disconnecting: boolean;
  onConnect: () => void;
  onReconnect?: () => void;
  onDisconnect?: () => void;
}) {
  return (
    <li className="rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-[var(--text-primary)]">
            {providerTitle(row.id)}
          </p>
          {row.detail ? (
            <p className="text-sm text-[var(--text-secondary)]">{row.detail}</p>
          ) : null}
          {row.tone !== "notConnected" ? (
            <p className="text-sm text-[var(--text-tertiary)]">
              Last synced {formatWhen(row.lastSynced)}
            </p>
          ) : null}
        </div>
        <span
          className={`text-sm font-semibold shrink-0 ${toneClass(row.tone)}`}
        >
          {row.headline}
        </span>
      </div>

      {row.id === "apple" && row.tone === "notConnected" ? (
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            Open DayPilot on your iPhone to allow calendar access. Events then
            appear here automatically (read-only on web).
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={DEEP_LINK}
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
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {row.tone === "notConnected" &&
          ssoBrandForProvider(row.id) &&
          row.id !== "apple" ? (
            <div className="w-full max-w-xs">
              <SsoBrandButton
                brand={ssoBrandForProvider(row.id)!}
                label={
                  connecting
                    ? "Redirecting…"
                    : ssoConnectLabel(row.id, false)
                }
                busy={connecting}
                disabled={busy}
                onClick={onConnect}
              />
            </div>
          ) : null}
          {onReconnect && ssoBrandForProvider(row.id) ? (
            <div className="w-full max-w-xs">
              <SsoBrandButton
                brand={ssoBrandForProvider(row.id)!}
                label={ssoConnectLabel(row.id, true)}
                disabled={busy}
                onClick={onReconnect}
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
          {onDisconnect ? (
            <button
              type="button"
              onClick={onDisconnect}
              disabled={busy}
              className="text-sm text-[var(--error)] hover:underline px-2"
            >
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </button>
          ) : null}
        </div>
      )}
    </li>
  );
}
