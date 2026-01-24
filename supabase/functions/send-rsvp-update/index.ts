/**
 * Send RSVP update email to organizer
 * Called when an attendee updates their RSVP status
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'DayPilot <noreply@daypilot.app>';

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

    const { attendeeId, rsvpStatus } = await req.json();

    if (!attendeeId || !rsvpStatus) {
      return new Response(
        JSON.stringify({ error: 'Missing attendeeId or rsvpStatus' }),
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
        rsvp_status,
        events!inner (
          id,
          title,
          start_time,
          end_time,
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

    if (!organizer?.email) {
      return new Response(
        JSON.stringify({ error: 'Organizer email not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const statusLabels = {
      going: 'Going',
      maybe: 'Maybe',
      declined: "Can't Attend",
    };

    const statusColors = {
      going: '#10B981',
      maybe: '#F59E0B',
      declined: '#EF4444',
    };

    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const eventDate = start.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const eventTime = `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2B3448; margin-bottom: 20px;">RSVP Update</h2>
        
        <p><strong>${attendee.name || attendee.email}</strong> has responded:</p>
        
        <div style="background: ${statusColors[rsvpStatus as keyof typeof statusColors]}20; border-left: 4px solid ${statusColors[rsvpStatus as keyof typeof statusColors]}; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0; font-size: 18px; font-weight: 600; color: ${statusColors[rsvpStatus as keyof typeof statusColors]};">
            ${statusLabels[rsvpStatus as keyof typeof statusLabels]}
          </p>
        </div>
        
        <div style="background: #f7f8fa; padding: 15px; border-radius: 8px; margin-top: 20px;">
          <p style="margin: 5px 0;"><strong>Event:</strong> ${event.title}</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${eventDate}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${eventTime}</p>
        </div>
      </body>
      </html>
    `;

    const text = `
RSVP Update

${attendee.name || attendee.email} has responded: ${statusLabels[rsvpStatus as keyof typeof statusLabels]}

Event: ${event.title}
Date: ${eventDate}
Time: ${eventTime}
    `.trim();

    // Send email via Resend
    if (!RESEND_API_KEY) {
      console.log('[Email not sent - no API key]', { to: organizer.email, subject: `${attendee.name || attendee.email} ${statusLabels[rsvpStatus as keyof typeof statusLabels]} - ${event.title}` });
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
        to: [organizer.email],
        subject: `${attendee.name || attendee.email} ${statusLabels[rsvpStatus as keyof typeof statusLabels]} - ${event.title}`,
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
    console.error('Error sending RSVP update email:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
