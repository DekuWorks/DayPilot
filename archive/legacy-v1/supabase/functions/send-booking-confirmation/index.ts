import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_FROM_EMAIL =
  Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@daypilot.app';

interface BookingData {
  id: string;
  booking_link_id: string;
  booker_name: string;
  booker_email: string;
  booker_phone: string | null;
  start_time: string;
  end_time: string;
  timezone: string;
  notes: string | null;
  booking_link: {
    id: string;
    title: string | null;
    description: string | null;
    duration: number;
    owner_user_id: string | null;
    organization_id: string | null;
  };
}

serve(async req => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { bookingId } = await req.json();

    if (!bookingId) {
      return new Response(JSON.stringify({ error: 'bookingId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(
        `
        id,
        booking_link_id,
        booker_name,
        booker_email,
        booker_phone,
        start_time,
        end_time,
        timezone,
        notes,
        booking_links!inner (
          id,
          title,
          description,
          duration,
          owner_user_id,
          organization_id
        )
      `
      )
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({
          error: 'Booking not found',
          details: bookingError?.message,
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const bookingData = booking as any;
    const bookingLink = bookingData.booking_links;

    // Get owner email
    let ownerEmail = '';
    let ownerName = '';

    if (bookingLink.owner_user_id) {
      const { data: owner } = await supabase
        .from('profiles')
        .select('email, name')
        .eq('id', bookingLink.owner_user_id)
        .single();

      if (owner) {
        ownerEmail = owner.email;
        ownerName = owner.name || '';
      }
    } else if (bookingLink.organization_id) {
      // For organization bookings, get the first admin/owner
      const { data: member } = await supabase
        .from('organization_members')
        .select('profiles!inner(email, name)')
        .eq('organization_id', bookingLink.organization_id)
        .in('role', ['owner', 'admin'])
        .limit(1)
        .single();

      if (member && (member as any).profiles) {
        ownerEmail = (member as any).profiles.email;
        ownerName = (member as any).profiles.name || '';
      }
    }

    // Format booking time
    const startTime = new Date(bookingData.start_time);
    const endTime = new Date(bookingData.end_time);
    const timezone = bookingData.timezone || 'UTC';

    const formattedStart = startTime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
    });

    const formattedEnd = endTime.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
    });

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send confirmation email to booker
    const bookerSubject = `Booking Confirmed: ${bookingLink.title || 'Appointment'}`;
    const bookerHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4FB3B3; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #F5E6D3; padding: 30px; border-radius: 0 0 8px 8px; }
            .booking-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .booking-title { font-size: 24px; font-weight: bold; color: #2B3448; margin-bottom: 10px; }
            .booking-details { color: #4f4f4f; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Booking Confirmed</h1>
            </div>
            <div class="content">
              <p>Hi ${bookingData.booker_name},</p>
              <p>Your booking has been confirmed!</p>
              <div class="booking-card">
                <div class="booking-title">${bookingLink.title || 'Appointment'}</div>
                ${bookingLink.description ? `<p class="booking-details">${bookingLink.description}</p>` : ''}
                <p class="booking-details"><strong>When:</strong> ${formattedStart} - ${formattedEnd}</p>
                <p class="booking-details"><strong>Duration:</strong> ${bookingLink.duration} minutes</p>
                ${bookingData.notes ? `<p class="booking-details"><strong>Notes:</strong> ${bookingData.notes}</p>` : ''}
              </div>
              <p>We look forward to meeting with you!</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const bookerText = `
Booking Confirmed

Hi ${bookingData.booker_name},

Your booking has been confirmed!

${bookingLink.title || 'Appointment'}
${bookingLink.description ? `\n${bookingLink.description}\n` : ''}
When: ${formattedStart} - ${formattedEnd}
Duration: ${bookingLink.duration} minutes
${bookingData.notes ? `\nNotes: ${bookingData.notes}\n` : ''}

We look forward to meeting with you!
    `;

    // Send email to booker
    const bookerEmailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: bookingData.booker_email,
        subject: bookerSubject,
        html: bookerHtml,
        text: bookerText,
      }),
    });

    // Send notification email to owner (if owner email exists)
    let ownerEmailSent = false;
    if (ownerEmail) {
      const ownerSubject = `New Booking: ${bookingLink.title || 'Appointment'}`;
      const ownerHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4FB3B3; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #F5E6D3; padding: 30px; border-radius: 0 0 8px 8px; }
              .booking-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .booking-title { font-size: 24px; font-weight: bold; color: #2B3448; margin-bottom: 10px; }
              .booking-details { color: #4f4f4f; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">New Booking</h1>
              </div>
              <div class="content">
                <p>Hi ${ownerName || 'there'},</p>
                <p>You have a new booking:</p>
                <div class="booking-card">
                  <div class="booking-title">${bookingLink.title || 'Appointment'}</div>
                  <p class="booking-details"><strong>Booked by:</strong> ${bookingData.booker_name}</p>
                  <p class="booking-details"><strong>Email:</strong> ${bookingData.booker_email}</p>
                  ${bookingData.booker_phone ? `<p class="booking-details"><strong>Phone:</strong> ${bookingData.booker_phone}</p>` : ''}
                  <p class="booking-details"><strong>When:</strong> ${formattedStart} - ${formattedEnd}</p>
                  <p class="booking-details"><strong>Duration:</strong> ${bookingLink.duration} minutes</p>
                  ${bookingData.notes ? `<p class="booking-details"><strong>Notes:</strong> ${bookingData.notes}</p>` : ''}
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      const ownerText = `
New Booking

Hi ${ownerName || 'there'},

You have a new booking:

${bookingLink.title || 'Appointment'}
Booked by: ${bookingData.booker_name}
Email: ${bookingData.booker_email}
${bookingData.booker_phone ? `Phone: ${bookingData.booker_phone}\n` : ''}
When: ${formattedStart} - ${formattedEnd}
Duration: ${bookingLink.duration} minutes
${bookingData.notes ? `\nNotes: ${bookingData.notes}\n` : ''}
      `;

      const ownerEmailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: RESEND_FROM_EMAIL,
          to: ownerEmail,
          subject: ownerSubject,
          html: ownerHtml,
          text: ownerText,
        }),
      });

      ownerEmailSent = ownerEmailResponse.ok;
    }

    return new Response(
      JSON.stringify({
        message: 'Booking confirmation emails sent',
        booker_email_sent: bookerEmailResponse.ok,
        owner_email_sent: ownerEmailSent,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-booking-confirmation function:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
