import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@daypilot.app';

interface ReminderData {
  id: string;
  event_id: string;
  reminder_type: string;
  minutes_before: number;
  sent_at: string | null;
  event: {
    id: string;
    title: string;
    description: string | null;
    start: string;
    end: string;
    timezone: string | null;
    calendar: {
      id: string;
      name: string;
      owner: {
        id: string;
        email: string;
        name: string | null;
      };
    };
  };
}

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for due reminders
    const now = new Date();
    const nowISO = now.toISOString();

    // Query reminders that are due and haven't been sent
    // Check reminders table (new structure) and event_reminders (legacy)
    const { data: newReminders, error: newRemindersError } = await supabase
      .from('reminders')
      .select(`
        id,
        event_id,
        send_at,
        type,
        recipient_email,
        events!inner (
          id,
          title,
          description,
          start_time,
          end_time,
          user_id,
          profiles!events_user_id_fkey (
            id,
            email,
            name
          )
        )
      `)
      .eq('status', 'pending')
      .lte('send_at', nowISO);

    // Also check legacy event_reminders table
    const { data: legacyReminders, error: legacyError } = await supabase
      .from('event_reminders')
      .select(`
        id,
        event_id,
        reminder_type,
        minutes_before,
        sent_at,
        events!inner (
          id,
          title,
          description,
          start,
          "end",
          timezone,
          calendars!inner (
            id,
            name,
            profiles!calendars_owner_id_fkey (
              id,
              email,
              name
            )
          )
        )
      `)
      .is('sent_at', null)
      .in('reminder_type', ['email', 'default', 'custom']);

    if (queryError) {
      console.error('Error querying reminders:', queryError);
      return new Response(
        JSON.stringify({ error: 'Failed to query reminders', details: queryError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No reminders to send', count: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Filter reminders that are actually due
    const dueReminders: ReminderData[] = [];
    
    for (const reminder of reminders) {
      const event = reminder.events as any;
      if (!event) continue;

      const eventStart = new Date(event.start);
      const reminderTime = new Date(eventStart.getTime() - reminder.minutes_before * 60 * 1000);
      
      // Check if reminder is due (within the last 5 minutes to avoid missing it)
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      if (reminderTime <= now && reminderTime >= fiveMinutesAgo) {
        dueReminders.push({
          id: reminder.id,
          event_id: reminder.event_id,
          reminder_type: reminder.reminder_type,
          minutes_before: reminder.minutes_before,
          sent_at: reminder.sent_at,
          event: {
            id: event.id,
            title: event.title,
            description: event.description,
            start: event.start,
            end: event.end,
            timezone: event.timezone,
            calendar: {
              id: event.calendars.id,
              name: event.calendars.name,
              owner: {
                id: event.calendars.profiles.id,
                email: event.calendars.profiles.email,
                name: event.calendars.profiles.name,
              },
            },
          },
        });
      }
    }

    if (dueReminders.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No reminders due at this time', count: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send emails for due reminders
    const results = [];
    
    for (const reminder of dueReminders) {
      try {
        // Format event time
        const eventStart = new Date(reminder.event.start);
        const eventEnd = new Date(reminder.event.end);
        const timezone = reminder.event.timezone || 'UTC';
        
        const formattedStart = eventStart.toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZone: timezone,
        });
        
        const formattedEnd = eventEnd.toLocaleString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          timeZone: timezone,
        });

        // Create email content
        const subject = `Reminder: ${reminder.event.title} in ${reminder.minutes_before} minutes`;
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #4FB3B3; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { background: #F5E6D3; padding: 30px; border-radius: 0 0 8px 8px; }
                .event-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .event-title { font-size: 24px; font-weight: bold; color: #2B3448; margin-bottom: 10px; }
                .event-details { color: #4f4f4f; margin: 10px 0; }
                .button { display: inline-block; background: #4FB3B3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0;">DayPilot Reminder</h1>
                </div>
                <div class="content">
                  <p>Hi ${reminder.event.calendar.owner.name || 'there'},</p>
                  <p>This is a reminder that you have an event coming up:</p>
                  <div class="event-card">
                    <div class="event-title">${reminder.event.title}</div>
                    ${reminder.event.description ? `<p class="event-details">${reminder.event.description}</p>` : ''}
                    <p class="event-details"><strong>When:</strong> ${formattedStart} - ${formattedEnd}</p>
                    <p class="event-details"><strong>Calendar:</strong> ${reminder.event.calendar.name}</p>
                  </div>
                  <p>The event starts in ${reminder.minutes_before} minutes.</p>
                  <a href="${supabaseUrl.replace('/rest/v1', '')}/app/calendar" class="button">View Calendar</a>
                </div>
              </div>
            </body>
          </html>
        `;

        const text = `
DayPilot Reminder

Hi ${reminder.event.calendar.owner.name || 'there'},

This is a reminder that you have an event coming up:

${reminder.event.title}
${reminder.event.description ? `\n${reminder.event.description}\n` : ''}
When: ${formattedStart} - ${formattedEnd}
Calendar: ${reminder.event.calendar.name}

The event starts in ${reminder.minutes_before} minutes.

View your calendar: ${supabaseUrl.replace('/rest/v1', '')}/app/calendar
        `;

        // Send email via Resend
        if (!RESEND_API_KEY) {
          console.error('RESEND_API_KEY not configured');
          results.push({ reminder_id: reminder.id, status: 'error', error: 'Email service not configured' });
          continue;
        }

        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: RESEND_FROM_EMAIL,
            to: reminder.event.calendar.owner.email,
            subject,
            html,
            text,
          }),
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.text();
          console.error('Error sending email:', errorData);
          results.push({ reminder_id: reminder.id, status: 'error', error: errorData });
          continue;
        }

        // Mark reminder as sent
        const { error: updateError } = await supabase
          .from('event_reminders')
          .update({ sent_at: nowISO })
          .eq('id', reminder.id);

        if (updateError) {
          console.error('Error updating reminder:', updateError);
          results.push({ reminder_id: reminder.id, status: 'error', error: updateError.message });
        } else {
          results.push({ reminder_id: reminder.id, status: 'sent', email: reminder.event.calendar.owner.email });
        }
      } catch (error: any) {
        console.error('Error processing reminder:', error);
        results.push({ reminder_id: reminder.id, status: 'error', error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Processed reminders',
        count: dueReminders.length,
        results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-reminders function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
