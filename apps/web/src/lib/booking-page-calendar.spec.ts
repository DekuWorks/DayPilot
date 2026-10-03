import assert from "node:assert/strict";
import test from "node:test";
import {
  groupSlotsByLocalDay,
  localDayKey,
  monthCells,
} from "./booking-page-calendar.ts";

test("October 2026 starts on Thursday and fills complete weeks", () => {
  const cells = monthCells(2026, 9);
  assert.equal(cells.length % 7, 0);
  assert.equal(cells[0], null);
  assert.equal(cells[3], null);
  assert.equal(cells[4]?.getDate(), 1);
  assert.equal(cells[4]?.getDay(), 4);
  assert.equal(cells.filter((cell) => cell?.getDate() === 31).length, 1);
});

test("slots group onto the viewer's local calendar day", () => {
  const morning = new Date(2026, 9, 2, 9, 0, 0);
  const afternoon = new Date(2026, 9, 2, 15, 30, 0);
  const next = new Date(2026, 9, 3, 9, 0, 0);
  const grouped = groupSlotsByLocalDay([
    { start: morning.toISOString(), id: "a" },
    { start: afternoon.toISOString(), id: "b" },
    { start: next.toISOString(), id: "c" },
  ]);
  assert.equal(grouped.get(localDayKey(morning))?.length, 2);
  assert.equal(grouped.get(localDayKey(next))?.length, 1);
});
