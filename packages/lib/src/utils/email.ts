/**
 * Email utility functions
 * Uses Supabase Edge Function to send emails via Resend
 */

import type { EmailTemplate } from './emailTypes';
import { supabaseClient } from '../supabaseClient';

/**
 * Send email via Supabase Edge Function (which uses Resend)
 */
export async function sendEmail(
  to: string,
  template: EmailTemplate,
  options?: {
    from?: string;
    replyTo?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      console.warn('[Email] Supabase URL not configured');
      return { success: false, error: 'Email service not configured' };
    }

    // Get auth session for authenticated requests
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
        from:
          options?.from ||
          import.meta.env.VITE_EMAIL_FROM ||
          'DayPilot <noreply@daypilot.co>',
        replyTo: options?.replyTo,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: await response.text() }));
      console.error('Email send failed:', errorData);
      return {
        success: false,
        error: errorData.error || errorData.message || 'Failed to send email',
      };
    }

    const result = await response.json();
    return { success: true };
  } catch (error: any) {
    console.error('Email send error:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

/**
 * Check if email is enabled
 */
export function isEmailEnabled(): boolean {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return !!supabaseUrl; // Email is enabled if Supabase is configured
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
