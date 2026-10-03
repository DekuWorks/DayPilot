import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildGuestMail,
  buildHostMail,
  hostNeedsOwnCopy,
  sameInstant,
  type OutboundMail,
  type StoredBooking,
} from './booking-mail';
import type { SendBookingConfirmationDto } from './dto/send-booking-confirmation.dto';

type BookingRow = {
  id: string;
  booker_name: string | null;
  booker_email: string | null;
  start_time: string;
  end_time: string;
  timezone: string | null;
  booking_links:
    | { title: string | null; owner_user_id: string | null }
    | { title: string | null; owner_user_id: string | null }[]
    | null;
};

export type ConfirmationResult = {
  sent: boolean;
  reason?: 'not_configured' | 'not_found' | 'send_failed';
};

@Injectable()
export class BookingConfirmationService {
  private readonly logger = new Logger(BookingConfirmationService.name);

  constructor(private readonly config: ConfigService) {}

  async send(input: SendBookingConfirmationDto): Promise<ConfirmationResult> {
    const resendKey = this.config.get<string>('RESEND_API_KEY')?.trim() ?? '';
    const supabaseUrl =
      this.config.get<string>('SUPABASE_URL')?.trim().replace(/\/$/, '') ?? '';
    const serviceKey =
      this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')?.trim() ?? '';
    if (!resendKey || !supabaseUrl || !serviceKey) {
      return { sent: false, reason: 'not_configured' };
    }

    const booking = await this.findBooking(
      supabaseUrl,
      serviceKey,
      input.bookingLinkId,
      input.start,
      input.bookerEmail,
    );
    if (!booking) return { sent: false, reason: 'not_found' };

    const from =
      this.config.get<string>('RESEND_FROM_EMAIL')?.trim() ||
      'DayPilot <hello@daypilot.co>';
    const guest = buildGuestMail(booking);
    const guestOk = await this.deliver(resendKey, from, guest);
    if (!guestOk) return { sent: false, reason: 'send_failed' };

    const hostEmail = await this.hostEmail(
      supabaseUrl,
      serviceKey,
      booking.ownerUserId,
    );
    const host = hostNeedsOwnCopy(booking.bookerEmail, hostEmail);
    if (host) {
      await this.deliver(resendKey, from, buildHostMail(booking, host));
    }
    return { sent: true };
  }

  private async findBooking(
    supabaseUrl: string,
    serviceKey: string,
    bookingLinkId: string,
    start: string,
    bookerEmail: string,
  ): Promise<StoredBooking | null> {
    const url = new URL(`${supabaseUrl}/rest/v1/bookings`);
    url.searchParams.set('booking_link_id', `eq.${bookingLinkId}`);
    url.searchParams.set('booker_email', `eq.${bookerEmail.trim()}`);
    url.searchParams.set('status', 'eq.confirmed');
    url.searchParams.set('order', 'created_at.desc');
    url.searchParams.set('limit', '5');
    url.searchParams.set(
      'select',
      'id,booker_name,booker_email,start_time,end_time,timezone,booking_links(title,owner_user_id)',
    );
    const res = await fetch(url, { headers: supabaseHeaders(serviceKey) });
    if (!res.ok) {
      this.logger.warn(`Booking lookup failed status=${res.status}`);
      return null;
    }
    const rows = (await res.json()) as BookingRow[];
    const row = rows.find((item) => sameInstant(item.start_time, start));
    if (!row?.booker_email) return null;
    const link = Array.isArray(row.booking_links)
      ? row.booking_links[0]
      : row.booking_links;
    return {
      id: row.id,
      bookerName: row.booker_name?.trim() || 'Guest',
      bookerEmail: row.booker_email.trim(),
      start: row.start_time,
      end: row.end_time,
      timeZone: row.timezone?.trim() || 'UTC',
      title: link?.title?.trim() || 'Booking',
      ownerUserId: link?.owner_user_id ?? null,
    };
  }

  private async hostEmail(
    supabaseUrl: string,
    serviceKey: string,
    ownerUserId: string | null,
  ): Promise<string | null> {
    if (!ownerUserId) return null;
    const url = new URL(`${supabaseUrl}/rest/v1/profiles`);
    url.searchParams.set('id', `eq.${ownerUserId}`);
    url.searchParams.set('select', 'email');
    const res = await fetch(url, { headers: supabaseHeaders(serviceKey) });
    if (!res.ok) return null;
    const rows = (await res.json()) as { email?: string | null }[];
    return rows[0]?.email?.trim() || null;
  }

  private async deliver(
    resendKey: string,
    from: string,
    mail: OutboundMail,
  ): Promise<boolean> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        attachments: [
          {
            filename: mail.filename,
            content: Buffer.from(mail.ics, 'utf8').toString('base64'),
          },
        ],
      }),
    });
    if (!res.ok) {
      this.logger.warn(`Confirmation email failed status=${res.status}`);
      return false;
    }
    return true;
  }
}

function supabaseHeaders(serviceKey: string): HeadersInit {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    Accept: 'application/json',
  };
}
