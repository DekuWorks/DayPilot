/** Local-day grouping for the public booking page. Dates are the viewer's calendar. */

export type DatedSlot = { start: string };

export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function groupSlotsByLocalDay<T extends DatedSlot>(
  slots: T[],
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const slot of slots) {
    const key = localDayKey(new Date(slot.start));
    const existing = grouped.get(key);
    if (existing) existing.push(slot);
    else grouped.set(key, [slot]);
  }
  return grouped;
}

/** Sunday-first month grid. Empty cells are leading or trailing padding. */
export function monthCells(year: number, month: number): Array<Date | null> {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = Array.from(
    { length: firstWeekday },
    () => null,
  );
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
