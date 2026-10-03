import { buildBookingIcs } from '@daypilot/lib';
import { BookingConfirmationService } from './booking-confirmation.service';
import {
  bookingIcsFor,
  buildGuestMail,
  buildHostMail,
  hostNeedsOwnCopy,
  sameInstant,
} from './booking-mail';

const booking = {
  id: '11111111-1111-1111-1111-111111111111',
  bookerName: 'Ada, Lovelace',
  bookerEmail: 'ada@example.com',
  start: '2026-01-05T14:00:00.000Z',
  end: '2026-01-05T14:30:00.000Z',
  timeZone: 'America/New_York',
  title: 'Book time',
  ownerUserId: 'owner',
};

describe('booking calendar file', () => {
  it('uses UTC instants and escapes commas in the summary text', () => {
    const ics = buildBookingIcs({
      uid: 'booking-1@daypilot.co',
      title: 'Hello, there',
      description: 'Line one',
      start: '2026-01-05T14:00:00.000Z',
      end: '2026-01-05T14:30:00.000Z',
      attendeeName: 'Ada',
      attendeeEmail: 'ada@example.com',
    });
    expect(ics).toContain('DTSTART:20260105T140000Z');
    expect(ics).toContain('DTEND:20260105T143000Z');
    expect(ics).toContain('SUMMARY:Hello\\, there');
    expect(ics).toContain('METHOD:PUBLISH');
    expect(ics.endsWith('\r\n')).toBe(true);
  });

  it('attaches that file to the guest confirmation', () => {
    const mail = buildGuestMail(booking);
    expect(mail.to).toBe('ada@example.com');
    expect(mail.filename).toBe('daypilot-booking.ics');
    expect(mail.ics).toContain('DTSTART:20260105T140000Z');
    expect(mail.ics).toContain('CN=Ada\\, Lovelace');
    expect(mail.html).toContain('Ada, Lovelace');
    expect(mail.html).not.toContain('<script');
  });

  it('does not email the host a second copy of their own booking', () => {
    expect(hostNeedsOwnCopy('ada@example.com', 'Ada@example.com')).toBeNull();
    expect(hostNeedsOwnCopy('ada@example.com', 'host@example.com')).toBe(
      'host@example.com',
    );
  });

  it('matches the stored start instant', () => {
    expect(sameInstant(booking.start, '2026-01-05T14:00:00.000Z')).toBe(true);
    expect(sameInstant(booking.start, '2026-01-05T15:00:00.000Z')).toBe(false);
  });

  it('does not call the mailer when it is not configured', async () => {
    const service = new BookingConfirmationService({
      get: () => '',
    } as never);
    await expect(
      service.send({
        bookingLinkId: '11111111-1111-1111-1111-111111111111',
        start: '2026-01-05T14:00:00.000Z',
        bookerEmail: 'ada@example.com',
      }),
    ).resolves.toEqual({ sent: false, reason: 'not_configured' });
  });

  it('includes a host-provided link and does not invent a provider meeting', () => {
    const mail = buildGuestMail({
      ...booking,
      meetingMethod: 'link',
      meetingJoinUrl: 'https://example.com/join',
    });
    expect(mail.text).toContain('https://example.com/join');
    expect(mail.text).not.toContain('Zoom');
    expect(mail.ics).toContain('https://example.com/join');
  });

  it('sends the host number only in the confirmed phone message', () => {
    const phoneBooking = {
      ...booking,
      meetingMethod: 'phone',
      hostPhone: '+1 202 555 0143',
      guestPhone: '+44 20 7946 0958',
    };
    const guest = buildGuestMail(phoneBooking);
    const host = buildHostMail(phoneBooking, 'host@example.com');
    expect(guest.text).toContain('The host will call you at +1 202 555 0143');
    expect(guest.text).not.toContain('https://');
    expect(host.text).toContain('Callback number: +44 20 7946 0958');
  });

  it('does not claim a meeting link when none was stored', () => {
    const mail = buildGuestMail({
      ...booking,
      meetingMethod: 'slack',
      meetingJoinUrl: null,
    });
    expect(mail.text).toContain('not ready');
    expect(mail.text).not.toContain('http');
  });

  it('guest file uid is the booking id', () => {
    expect(bookingIcsFor(booking)).toContain(
      'UID:booking-11111111-1111-1111-1111-111111111111@daypilot.co',
    );
  });
});
