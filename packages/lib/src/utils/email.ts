/**
 * Email utility functions
 * For MVP, these can be called from client-side but will need server-side implementation
 * for production (e.g., Resend API)
 */

import type { EmailTemplate } from './emailTypes';

const EMAIL_API_URL = import.meta.env.VITE_EMAIL_API_URL || '';
const EMAIL_API_KEY = import.meta.env.VITE_EMAIL_API_KEY || '';

/**
 * Send email (client-side stub - will need server endpoint in production)
 */
export async function sendEmail(
  to: string,
  template: EmailTemplate,
  options?: {
    from?: string;
    replyTo?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  // For MVP, log the email instead of actually sending
  // In production, this would call a server endpoint that uses Resend

  if (!EMAIL_API_URL || !EMAIL_API_KEY) {
    console.log('[Email (not sent - no API configured)]', {
      to,
      subject: template.subject,
      // Don't log full HTML in console
    });

    // In development, you might want to show a toast or notification
    // that emails are not configured
    return { success: true }; // Return success so app doesn't break
  }

  try {
    const response = await fetch(`${EMAIL_API_URL}/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${EMAIL_API_KEY}`,
      },
      body: JSON.stringify({
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
        from:
          options?.from ||
          import.meta.env.VITE_EMAIL_FROM ||
          'noreply@daypilot.app',
        replyTo: options?.replyTo,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Email send failed:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if email is enabled
 */
export function isEmailEnabled(): boolean {
  return !!(EMAIL_API_URL && EMAIL_API_KEY);
}

/**
 * Get user email preferences
 */
export function getUserEmailPreferences(): {
  remindersEnabled: boolean;
  defaultReminderMinutes: number;
} {
  try {
    const prefs = localStorage.getItem('daypilot-email-preferences');
    if (prefs) {
      return JSON.parse(prefs);
    }
  } catch (err) {
    console.error('Failed to load email preferences:', err);
  }

  return {
    remindersEnabled: true,
    defaultReminderMinutes: 30,
  };
}

/**
 * Save user email preferences
 */
export function saveUserEmailPreferences(preferences: {
  remindersEnabled: boolean;
  defaultReminderMinutes: number;
}): void {
  try {
    localStorage.setItem(
      'daypilot-email-preferences',
      JSON.stringify(preferences)
    );
  } catch (err) {
    console.error('Failed to save email preferences:', err);
  }
}
