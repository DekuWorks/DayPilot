/**
 * Email templates for DayPilot
 * Simple, clean templates focused on clarity
 */

import type { EmailTemplate } from '@daypilot/lib';

/**
 * Event Invite Email
 */
export function eventInviteTemplate(data: {
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  organizerName: string;
  organizerEmail: string;
  rsvpLink: string;
  eventDescription?: string;
}): EmailTemplate {
  const subject = `You're invited: ${data.eventTitle}`;
  
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
        <h3 style="margin-top: 0; color: #2B3448;">${data.eventTitle}</h3>
        <p style="margin: 10px 0;"><strong>Date:</strong> ${data.eventDate}</p>
        <p style="margin: 10px 0;"><strong>Time:</strong> ${data.eventTime}</p>
        ${data.eventDescription ? `<p style="margin: 10px 0;">${data.eventDescription}</p>` : ''}
        <p style="margin: 10px 0;"><strong>Organizer:</strong> ${data.organizerName || data.organizerEmail}</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.rsvpLink}" style="display: inline-block; background: #4FB3B3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">RSVP</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        This invitation was sent from DayPilot. Click the RSVP button above to respond.
      </p>
    </body>
    </html>
  `;
  
  const text = `
You're Invited

${data.eventTitle}
Date: ${data.eventDate}
Time: ${data.eventTime}
${data.eventDescription ? `Description: ${data.eventDescription}` : ''}
Organizer: ${data.organizerName || data.organizerEmail}

RSVP: ${data.rsvpLink}

This invitation was sent from DayPilot.
  `.trim();
  
  return { subject, html, text };
}

/**
 * RSVP Update Email (to organizer)
 */
export function rsvpUpdateTemplate(data: {
  attendeeName: string;
  attendeeEmail: string;
  rsvpStatus: 'going' | 'maybe' | 'declined';
  eventTitle: string;
  eventDate: string;
  eventTime: string;
}): EmailTemplate {
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
  
  const subject = `${data.attendeeName || data.attendeeEmail} ${statusLabels[data.rsvpStatus]} - ${data.eventTitle}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2B3448; margin-bottom: 20px;">RSVP Update</h2>
      
      <p><strong>${data.attendeeName || data.attendeeEmail}</strong> has responded:</p>
      
      <div style="background: ${statusColors[data.rsvpStatus]}20; border-left: 4px solid ${statusColors[data.rsvpStatus]}; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0; font-size: 18px; font-weight: 600; color: ${statusColors[data.rsvpStatus]};">
          ${statusLabels[data.rsvpStatus]}
        </p>
      </div>
      
      <div style="background: #f7f8fa; padding: 15px; border-radius: 8px; margin-top: 20px;">
        <p style="margin: 5px 0;"><strong>Event:</strong> ${data.eventTitle}</p>
        <p style="margin: 5px 0;"><strong>Date:</strong> ${data.eventDate}</p>
        <p style="margin: 5px 0;"><strong>Time:</strong> ${data.eventTime}</p>
      </div>
    </body>
    </html>
  `;
  
  const text = `
RSVP Update

${data.attendeeName || data.attendeeEmail} has responded: ${statusLabels[data.rsvpStatus]}

Event: ${data.eventTitle}
Date: ${data.eventDate}
Time: ${data.eventTime}
  `.trim();
  
  return { subject, html, text };
}

/**
 * Reminder Email
 */
export function reminderTemplate(data: {
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  minutesUntil: number;
  eventDescription?: string;
  organizerName?: string;
}): EmailTemplate {
  const timeText = data.minutesUntil < 60 
    ? `in ${data.minutesUntil} minute${data.minutesUntil !== 1 ? 's' : ''}`
    : `in ${Math.floor(data.minutesUntil / 60)} hour${Math.floor(data.minutesUntil / 60) !== 1 ? 's' : ''}`;
  
  const subject = `Reminder: ${data.eventTitle} starting ${timeText}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2B3448; margin-bottom: 20px;">Event Reminder</h2>
      
      <p style="font-size: 18px; color: #4FB3B3; font-weight: 600; margin-bottom: 20px;">
        ${data.eventTitle} starts ${timeText}
      </p>
      
      <div style="background: #f7f8fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 10px 0;"><strong>Date:</strong> ${data.eventDate}</p>
        <p style="margin: 10px 0;"><strong>Time:</strong> ${data.eventTime}</p>
        ${data.eventDescription ? `<p style="margin: 10px 0;">${data.eventDescription}</p>` : ''}
        ${data.organizerName ? `<p style="margin: 10px 0;"><strong>Organizer:</strong> ${data.organizerName}</p>` : ''}
      </div>
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        This reminder was sent from DayPilot.
      </p>
    </body>
    </html>
  `;
  
  const text = `
Event Reminder

${data.eventTitle} starts ${timeText}

Date: ${data.eventDate}
Time: ${data.eventTime}
${data.eventDescription ? `Description: ${data.eventDescription}` : ''}
${data.organizerName ? `Organizer: ${data.organizerName}` : ''}

This reminder was sent from DayPilot.
  `.trim();
  
  return { subject, html, text };
}

/**
 * Booking Confirmation Email
 */
export function bookingConfirmationTemplate(data: {
  bookingTitle: string;
  bookerName: string;
  bookerEmail: string;
  bookingDate: string;
  bookingTime: string;
  duration: number;
  notes?: string;
  calendarLink?: string;
}): EmailTemplate {
  const subject = `Booking Confirmed: ${data.bookingTitle}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2B3448; margin-bottom: 20px;">Booking Confirmed</h2>
      
      <p>Hi ${data.bookerName},</p>
      
      <p>Your booking has been confirmed:</p>
      
      <div style="background: #f7f8fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #2B3448;">${data.bookingTitle}</h3>
        <p style="margin: 10px 0;"><strong>Date:</strong> ${data.bookingDate}</p>
        <p style="margin: 10px 0;"><strong>Time:</strong> ${data.bookingTime}</p>
        <p style="margin: 10px 0;"><strong>Duration:</strong> ${data.duration} minutes</p>
        ${data.notes ? `<p style="margin: 10px 0;"><strong>Notes:</strong> ${data.notes}</p>` : ''}
      </div>
      
      ${data.calendarLink ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.calendarLink}" style="display: inline-block; background: #4FB3B3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Add to Calendar</a>
      </div>
      ` : ''}
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        This confirmation was sent from DayPilot.
      </p>
    </body>
    </html>
  `;
  
  const text = `
Booking Confirmed

Hi ${data.bookerName},

Your booking has been confirmed:

${data.bookingTitle}
Date: ${data.bookingDate}
Time: ${data.bookingTime}
Duration: ${data.duration} minutes
${data.notes ? `Notes: ${data.notes}` : ''}

${data.calendarLink ? `Add to Calendar: ${data.calendarLink}` : ''}

This confirmation was sent from DayPilot.
  `.trim();
  
  return { subject, html, text };
}
