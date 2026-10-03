import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPublicSlots, zonedWallTimeToUtc } from "./booking-slots.ts";

test("winter and summer New York hours convert to the right UTC instant", () => {
  assert.equal(
    zonedWallTimeToUtc(2026, 1, 5, 9, 0, "America/New_York").toISOString(),
    "2026-01-05T14:00:00.000Z",
  );
  assert.equal(
    zonedWallTimeToUtc(2026, 7, 6, 9, 0, "America/New_York").toISOString(),
    "2026-07-06T13:00:00.000Z",
  );
});

test("slots follow the host timezone, not the machine timezone", () => {
  const slots = buildPublicSlots({
    linkId: "link-1",
    timeZone: "America/New_York",
    durationMin: 60,
    rules: [{ dayOfWeek: 1, start: "09:00", end: "11:00" }],
    excludedDates: [],
    busy: [],
    now: new Date("2026-01-05T13:30:00.000Z"),
    days: 1,
  });

  assert.deepEqual(
    slots.map((slot) => slot.start),
    ["2026-01-05T14:00:00.000Z", "2026-01-05T15:00:00.000Z"],
  );
});

test("a booked interval and an excluded date are not offered", () => {
  const slots = buildPublicSlots({
    linkId: "link-1",
    timeZone: "UTC",
    durationMin: 60,
    rules: [{ dayOfWeek: 1, start: "09:00", end: "12:00" }],
    excludedDates: ["2026-01-12"],
    busy: [
      {
        start: "2026-01-05T09:00:00.000Z",
        end: "2026-01-05T10:00:00.000Z",
      },
    ],
    now: new Date("2026-01-05T08:00:00.000Z"),
    days: 8,
  });

  assert.deepEqual(
    slots.map((slot) => slot.start),
    ["2026-01-05T10:00:00.000Z", "2026-01-05T11:00:00.000Z"],
  );
});
