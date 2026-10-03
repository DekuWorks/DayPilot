/** iCalendar file for a confirmed booking. UTC instants, METHOD:PUBLISH. */

export type BookingIcsInput = {
  uid: string;
  title: string;
  description: string;
  start: string;
  end: string;
  attendeeName: string;
  attendeeEmail: string;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatIcsUtc(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid booking time");
  }
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\n|\r/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  let index = 75;
  while (index < line.length) {
    parts.push(` ${line.slice(index, index + 74)}`);
    index += 74;
  }
  return parts.join("\r\n");
}

export function buildBookingIcs(input: BookingIcsInput): string {
  const stamp = formatIcsUtc(new Date().toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DayPilot//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(input.uid)}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${formatIcsUtc(input.start)}`,
    `DTEND:${formatIcsUtc(input.end)}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
    `DESCRIPTION:${escapeIcsText(input.description)}`,
    "ORGANIZER;CN=DayPilot:mailto:hello@daypilot.co",
    `ATTENDEE;CN=${escapeIcsText(input.attendeeName)};RSVP=FALSE:mailto:${input.attendeeEmail.trim()}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
