import assert from "node:assert/strict";
import { test } from "node:test";
import { NATIVE_CALENDAR_COLOR, calendarChipStyle } from "./event-color.ts";

test("native calendars use sage, not electric green", () => {
  assert.equal(NATIVE_CALENDAR_COLOR, "#3D9B6A");
  assert.notEqual(NATIVE_CALENDAR_COLOR, "#42E85F");
  assert.notEqual(NATIVE_CALENDAR_COLOR, "#39FF14");

  const native = calendarChipStyle({ source: "native" });
  const booking = calendarChipStyle({ source: "booking" });
  assert.equal(native.accent, "#3D9B6A");
  assert.equal(booking.accent, "#3D9B6A");

  const stored = calendarChipStyle({
    calendarColor: "#E74C3C",
    source: "native",
  });
  assert.equal(stored.accent, "#E74C3C");
});
