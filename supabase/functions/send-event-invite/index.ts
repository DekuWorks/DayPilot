/**
 * Send event invite email
 * Called when an attendee is added to an event
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'DayPilot <noreply@daypilot.app>';
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'http://localhost:5174';

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { attendeeId } = await req.json();

    if (!attendeeId) {
      return new Response(
        JSON.stringify({ error: 'Missing attendeeId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch attendee and event details
    const { data: attendee, error: attendeeError } = await supabase
      .from('attendees')
      .select(`
        id,
        email,
        name,
        invite_token,
        events!inner (
          id,
          title,
          description,
          start_time,
          end_time,
          location,
          user_id,
          profiles!events_user_id_fkey (
            name,
            email
          )
        )
      `)
      .eq('id', attendeeId)
      .single();

    if (attendeeError || !attendee) {
      return new Response(
        JSON.stringify({ error: 'Attendee not found', details: attendeeError }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const event = attendee.events;
    const organizer = event.profiles;
    const rsvpLink = `${FRONTEND_URL}/rsvp/${attendee.invite_token}`;

    // Format dates
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const eventDate = start.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const eventTime = `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;

    // Generate email HTML
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2B3448; margin-bottom: 20px;">You're Invited</h2>
        
        <div style="background: #f7f8fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #2B3448;">${event.title}</h3>
          <p style="margin: 10px 0;"><strong>Date:</strong> ${eventDate}</p>
          <p style="margin: 10px 0;"><strong>Time:</strong> ${eventTime}</p>
          ${event.description ? `<p style="margin: 10px 0;">${event.description}</p>` : ''}
          ${event.location ? `<p style="margin: 10px 0;"><strong>Location:</strong> ${event.location}</p>` : ''}
          <p style="margin: 10px 0;"><strong>Organizer:</strong> ${organizer?.name || organizer?.email || 'DayPilot User'}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${rsvpLink}" style="display: inline-block; background: #4FB3B3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">RSVP</a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This invitation was sent from DayPilot. Click the RSVP button above to respond.
        </p>
      </body>
      </html>
    `;

    const text = `
You're Invited

${event.title}
Date: ${eventDate}
Time: ${eventTime}
${event.description ? `Description: ${event.description}` : ''}
${event.location ? `Location: ${event.location}` : ''}
Organizer: ${organizer?.name || organizer?.email || 'DayPilot User'}

RSVP: ${rsvpLink}

This invitation was sent from DayPilot.
    `.trim();

    // Send email via Resend
    if (!RESEND_API_KEY) {
      console.log('[Email not sent - no API key]', { to: attendee.email, subject: `You're invited: ${event.title}` });
      return new Response(
        JSON.stringify({ success: true, message: 'Email logged (not configured)' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [attendee.email],
        subject: `You're invited: ${event.title}`,
        html,
        text,
      }),
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      console.error('Resend API error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: error }),
        { status: resendResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await resendResponse.json();

    return new Response(
      JSON.stringify({ success: true, emailId: result.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error sending invite email:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
