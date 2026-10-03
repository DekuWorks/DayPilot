import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mapAppleEventKitUi,
  mapAppleProviderUi,
  type CalendarProviderUi,
} from "./calendar-connection-ui.ts";

function row(calendarStatus: string, syncStatus = "idle"): CalendarProviderUi {
  return mapAppleEventKitUi({
    authSeparate: true,
    hasGoogleConnection: false,
    hasMicrosoftConnection: false,
    connections: [
      {
        id: "ek-1",
        provider: "apple_eventkit",
        displayName: "Marcus’s iPhone",
        deviceId: "dev-1",
        authStatus: "connected",
        calendarStatus,
        syncStatus,
        lastSyncedAt: "2026-09-01T12:00:00.000Z",
        calendars: [
          { id: "c1", title: "Home", isSelected: true, isReadOnly: false },
        ],
      },
    ],
  });
}

test("no EventKit rows means not connected", () => {
  const ui = mapAppleEventKitUi({
    authSeparate: true,
    hasGoogleConnection: false,
    hasMicrosoftConnection: false,
    connections: [],
  });
  assert.equal(ui.tone, "notConnected");
  assert.equal(ui.canSync, false);
});

test("denied EventKit permission is needsAttention, not healthy", () => {
  const ui = row("denied");
  assert.equal(ui.tone, "needsAttention");
  assert.equal(ui.canSync, false);
  assert.match(ui.detail, /Sign in with Apple is not a calendar connection/);
});

test("permission_required is needsAttention", () => {
  assert.equal(row("permission_required").tone, "needsAttention");
});

test("healthy EventKit row stays connected", () => {
  const ui = row("connected");
  assert.equal(ui.tone, "healthy");
  assert.equal(ui.canSync, true);
  assert.equal(ui.headline, "Connected");
});

test("iCloud connects on the web when the phone has not", () => {
  const ui = mapAppleProviderUi({
    eventKitStatus: {
      authSeparate: true,
      hasGoogleConnection: false,
      hasMicrosoftConnection: false,
      connections: [],
    },
    icloud: {
      id: "icloud-1",
      provider: "apple",
      email: "person@icloud.com",
      syncedAt: null,
      validatedAt: null,
      expiresAt: null,
      connectedAt: "2026-10-02T00:00:00.000Z",
      status: "valid",
      connected: true,
    },
  });
  assert.equal(ui.tone, "healthy");
  assert.equal(ui.canDisconnect, true);
  assert.match(ui.detail, /iCloud/);
});
