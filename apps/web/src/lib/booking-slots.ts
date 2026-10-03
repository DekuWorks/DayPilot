/** Host-timezone slot math for public booking links. */

export type AvailabilityRule = {
  dayOfWeek: number;
  start: string;
  end: string;
};

export type BusyInterval = {
  start: string;
  end: string;
};

export type BuiltSlot = {
  id: string;
  start: string;
  end: string;
};

type CivilDate = { year: number; month: number; day: number };

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function civilKey(date: CivilDate) {
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`;
}

function addCivilDays(date: CivilDate, days: number): CivilDate {
  const utc = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

/** Weekday of a civil date. 0 = Sunday, matching availability_rules.day_of_week. */
export function civilWeekday(date: CivilDate) {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}

function zoneParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instant);
  const pick = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour"),
    minute: pick("minute"),
  };
}

/** Wall-clock time in [timeZone] as a UTC instant. */
export function zonedWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 4; i++) {
    const parts = zoneParts(new Date(utc), timeZone);
    const asUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
    );
    const desired = Date.UTC(year, month - 1, day, hour, minute);
    const diff = asUtc - desired;
    if (diff === 0) break;
    utc -= diff;
  }
  return new Date(utc);
}

export function todayInZone(timeZone: string, now: Date): CivilDate {
  const parts = zoneParts(now, timeZone);
  return { year: parts.year, month: parts.month, day: parts.day };
}

function parseTime(value: string) {
  const [hour, minute] = value.split(":");
  return { hour: Number(hour) || 0, minute: Number(minute) || 0 };
}

export function buildPublicSlots(input: {
  linkId: string;
  timeZone: string;
  durationMin: number;
  rules: AvailabilityRule[];
  excludedDates: string[];
  busy: BusyInterval[];
  now?: Date;
  days?: number;
}): BuiltSlot[] {
  const timeZone = input.timeZone || "UTC";
  const now = input.now ?? new Date();
  const days = input.days ?? 21;
  const durationMs = Math.max(1, input.durationMin) * 60_000;
  const excluded = new Set(input.excludedDates.map((d) => d.slice(0, 10)));
  const busy = input.busy.map((interval) => ({
    start: new Date(interval.start).getTime(),
    end: new Date(interval.end).getTime(),
  }));
  const rules = input.rules.filter((rule) => rule.dayOfWeek >= 0);
  const slots: BuiltSlot[] = [];
  let day = todayInZone(timeZone, now);

  for (let offset = 0; offset < days; offset++) {
    const key = civilKey(day);
    const weekday = civilWeekday(day);
    if (!excluded.has(key)) {
      for (const rule of rules) {
        if (rule.dayOfWeek !== weekday) continue;
        const startT = parseTime(rule.start);
        const endT = parseTime(rule.end);
        let cursor = zonedWallTimeToUtc(
          day.year,
          day.month,
          day.day,
          startT.hour,
          startT.minute,
          timeZone,
        );
        const dayEnd = zonedWallTimeToUtc(
          day.year,
          day.month,
          day.day,
          endT.hour,
          endT.minute,
          timeZone,
        );
        while (cursor < dayEnd) {
          const slotEnd = new Date(cursor.getTime() + durationMs);
          if (slotEnd > dayEnd) break;
          if (slotEnd > now) {
            const startMs = cursor.getTime();
            const endMs = slotEnd.getTime();
            const overlaps = busy.some(
              (interval) => startMs < interval.end && endMs > interval.start,
            );
            if (!overlaps) {
              slots.push({
                id: `${input.linkId}|${cursor.toISOString()}`,
                start: cursor.toISOString(),
                end: slotEnd.toISOString(),
              });
            }
          }
          cursor = slotEnd;
        }
      }
    }
    day = addCivilDays(day, 1);
  }

  return slots;
}
