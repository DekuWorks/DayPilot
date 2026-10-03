import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeBookingEvents } from "./booking-calendar.ts";

test("confirmed bookings appear on the calendar without duplicating the same time", () => {
  const merged = mergeBookingEvents(
    [
      {
        id: "event-1",
        title: "Standup",
        start: "2026-10-02T15:00:00.000Z",
        end: "2026-10-02T15:30:00.000Z",
        source: "native",
      },
    ],
    [
      {
        id: "book-1",
        title: "Intro call",
        bookerName: "Ada",
        bookerEmail: "ada@example.com",
        start: "2026-10-02T16:00:00.000Z",
        end: "2026-10-02T16:30:00.000Z",
      },
      {
        id: "book-2",
        title: "Intro call",
        bookerName: "Grace",
        bookerEmail: "grace@example.com",
        start: "2026-10-02T15:00:00.000Z",
        end: "2026-10-02T15:30:00.000Z",
      },
    ],
  );

  assert.equal(merged.length, 2);
  assert.equal(merged[1]?.id, "booking:book-1");
  assert.equal(merged[1]?.title, "Intro call · Ada");
  assert.equal(merged[1]?.source, "booking");
  assert.equal(merged[1]?.syncDirection, "imported");
  assert.match(merged[1]?.description ?? "", /ada@example.com/);
});
