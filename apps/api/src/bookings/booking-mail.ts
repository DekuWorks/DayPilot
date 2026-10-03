import { buildBookingIcs } from '@daypilot/lib';

export type StoredBooking = {
  id: string;
  bookerName: string;
  bookerEmail: string;
  start: string;
  end: string;
  timeZone: string;
  title: string;
  ownerUserId: string | null;
};

export type OutboundMail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  filename: string;
  ics: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatBookingWhen(iso: string, timeZone: string): string {
  const date = new Date(iso);
  const zone = timeZone.trim() || 'UTC';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: zone,
      timeZoneName: 'short',
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short',
    }).format(date);
  }
}

export function bookingIcsFor(booking: StoredBooking): string {
  const when = formatBookingWhen(booking.start, booking.timeZone);
  return buildBookingIcs({
    uid: `booking-${booking.id}@daypilot.co`,
    title: booking.title,
    description: `${booking.title} with ${booking.bookerName}. ${when}. Booked on DayPilot.`,
    start: booking.start,
    end: booking.end,
    attendeeName: booking.bookerName,
    attendeeEmail: booking.bookerEmail,
  });
}

export function buildGuestMail(booking: StoredBooking): OutboundMail {
  const when = formatBookingWhen(booking.start, booking.timeZone);
  const title = booking.title || 'Booking';
  const safeTitle = escapeHtml(title);
  const safeName = escapeHtml(booking.bookerName);
  const safeWhen = escapeHtml(when);
  return {
    to: booking.bookerEmail.trim(),
    subject: `You're booked: ${title}`,
    text: [
      `Hi ${booking.bookerName},`,
      '',
      `You're booked for ${title}.`,
      when,
      '',
      'A calendar file is attached. Open it to add this time to your calendar.',
      'DayPilot does not send a second reminder.',
    ].join('\n'),
    html: `<p>Hi ${safeName},</p><p>You're booked for <strong>${safeTitle}</strong>.</p><p>${safeWhen}</p><p>A calendar file is attached. Open it to add this time to your calendar.</p>`,
    filename: 'daypilot-booking.ics',
    ics: bookingIcsFor(booking),
  };
}

export function buildHostMail(
  booking: StoredBooking,
  hostEmail: string,
): OutboundMail {
  const when = formatBookingWhen(booking.start, booking.timeZone);
  const title = booking.title || 'Booking';
  return {
    to: hostEmail.trim(),
    subject: `New booking: ${booking.bookerName}`,
    text: [
      `${booking.bookerName} booked ${title}.`,
      when,
      `Email: ${booking.bookerEmail}`,
      '',
      'A calendar file is attached. This time also shows on your DayPilot calendar.',
    ].join('\n'),
    html: `<p><strong>${escapeHtml(booking.bookerName)}</strong> booked ${escapeHtml(title)}.</p><p>${escapeHtml(when)}</p><p>A calendar file is attached. This time also shows on your DayPilot calendar.</p>`,
    filename: 'daypilot-booking.ics',
    ics: bookingIcsFor(booking),
  };
}

/** Same address once. Host is omitted when it matches the guest. */
export function hostNeedsOwnCopy(
  guestEmail: string,
  hostEmail: string | null | undefined,
): string | null {
  const host = hostEmail?.trim() ?? '';
  if (!host) return null;
  if (host.toLowerCase() === guestEmail.trim().toLowerCase()) return null;
  return host;
}

export function sameInstant(left: string, right: string): boolean {
  const a = new Date(left).getTime();
  const b = new Date(right).getTime();
  return Number.isFinite(a) && a === b;
}
