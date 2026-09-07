export type GoogleDateLike = {
  dateTime?: string | null;
  date?: string | null;
  timeZone?: string | null;
};

export type OutlookDateLike = {
  dateTime?: string | null;
  timeZone?: string | null;
};

export function googleEventTimeFields(item: {
  start?: GoogleDateLike;
  end?: GoogleDateLike;
  recurrence?: string[] | null;
  recurringEventId?: string | null;
}): {
  allDay: boolean;
  timezone: string | null;
  recurrenceRule: string | null;
  seriesId: string | null;
} {
  const allDay = !item.start?.dateTime && !!item.start?.date;
  const timezone = item.start?.timeZone || item.end?.timeZone || null;
  const recurrenceRule = item.recurrence?.filter(Boolean).join('\n') || null;
  return {
    allDay,
    timezone,
    recurrenceRule,
    seriesId: item.recurringEventId || null,
  };
}

export function outlookEventTimeFields(item: {
  isAllDay?: boolean | null;
  start?: OutlookDateLike;
  end?: OutlookDateLike;
  seriesMasterId?: string | null;
  recurrence?: {
    pattern?: { type?: string | null; interval?: number | null } | null;
  } | null;
}): {
  allDay: boolean;
  timezone: string | null;
  recurrenceRule: string | null;
  seriesId: string | null;
} {
  const pattern = item.recurrence?.pattern;
  const recurrenceRule = pattern?.type
    ? `FREQ=${String(pattern.type).toUpperCase()}${
        pattern.interval ? `;INTERVAL=${pattern.interval}` : ''
      }`
    : null;
  return {
    allDay: item.isAllDay === true,
    timezone: item.start?.timeZone || item.end?.timeZone || null,
    recurrenceRule,
    seriesId: item.seriesMasterId || null,
  };
}
