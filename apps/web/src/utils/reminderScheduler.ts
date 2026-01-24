/**
 * Reminder scheduler for email notifications
 * Runs periodically to send reminder emails for upcoming events
 */

import { getEvents, getUserEmailPreferences } from '@daypilot/lib';
import { reminderTemplate } from '../emails/templates';
import { sendEmail } from '@daypilot/lib';
import type { LocalEvent } from '../features/pilotBrief/pilotBriefTypes';

const SENT_REMINDERS_KEY = 'daypilot-sent-reminders';
const REMINDER_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

interface SentReminder {
  eventId: string;
  reminderTime: number; // timestamp in minutes before event
  sentAt: string;
}

/**
 * Get sent reminders from storage
 */
function getSentReminders(): SentReminder[] {
  try {
    const stored = localStorage.getItem(SENT_REMINDERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save sent reminder
 */
function saveSentReminder(reminder: SentReminder): void {
  const reminders = getSentReminders();
  reminders.push(reminder);
  localStorage.setItem(SENT_REMINDERS_KEY, JSON.stringify(reminders));
}

/**
 * Check if reminder was already sent
 */
function wasReminderSent(eventId: string, reminderMinutes: number): boolean {
  const reminders = getSentReminders();
  return reminders.some(
    r => r.eventId === eventId && r.reminderTime === reminderMinutes
  );
}

/**
 * Clean old reminders (older than 7 days)
 */
function cleanOldReminders(): void {
  const reminders = getSentReminders();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const filtered = reminders.filter(r => new Date(r.sentAt).getTime() > sevenDaysAgo);
  localStorage.setItem(SENT_REMINDERS_KEY, JSON.stringify(filtered));
}

/**
 * Send reminder for an event (for future use with attendee lookup)
 */
export async function sendReminderForEvent(
  event: LocalEvent,
  reminderMinutes: number,
  attendeeEmail: string
): Promise<void> {
  if (wasReminderSent(event.id, reminderMinutes)) {
    return; // Already sent
  }

  const eventStart = new Date(event.start);
  const now = new Date();
  const minutesUntil = Math.floor((eventStart.getTime() - now.getTime()) / (1000 * 60));

  if (minutesUntil < 0 || minutesUntil > reminderMinutes + 5) {
    return; // Too early or too late
  }

  try {
    const template = reminderTemplate({
      eventTitle: event.title,
      eventDate: eventStart.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      eventTime: eventStart.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }),
      minutesUntil,
      eventDescription: event.description || undefined,
    });

    const result = await sendEmail(attendeeEmail, template);
    
    if (result.success) {
      saveSentReminder({
        eventId: event.id,
        reminderTime: reminderMinutes,
        sentAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Failed to send reminder:', error);
  }
}

/**
 * Check and send reminders for upcoming events
 */
export async function checkAndSendReminders(): Promise<void> {
  const preferences = getUserEmailPreferences();
  
  if (!preferences.remindersEnabled) {
    return; // Reminders disabled
  }

  cleanOldReminders();

  const events = getEvents() as LocalEvent[];
  const now = new Date();
  const reminderWindow = preferences.defaultReminderMinutes + 10; // 10 min buffer

  // Get upcoming events within reminder window
  const upcomingEvents = events.filter(event => {
    if (event.all_day || event.status !== 'scheduled') return false;
    
    const eventStart = new Date(event.start);
    const minutesUntil = (eventStart.getTime() - now.getTime()) / (1000 * 60);
    
    return minutesUntil > 0 && minutesUntil <= reminderWindow;
  });

  // Send reminders for each event
  for (const event of upcomingEvents) {
    // In a real app, you'd get attendees from the database
    // For MVP, we'll skip attendee-based reminders and just log
    // This would need to be enhanced with actual attendee lookup
    console.log(`[Reminder] Event "${event.title}" starting soon`);
  }
}

/**
 * Start reminder scheduler
 */
export function startReminderScheduler(): () => void {
  // Run immediately
  checkAndSendReminders();
  
  // Then run periodically
  const interval = setInterval(() => {
    checkAndSendReminders();
  }, REMINDER_CHECK_INTERVAL);

  // Return cleanup function
  return () => clearInterval(interval);
}
