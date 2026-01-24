/**
 * Supabase-based storage implementation
 * Replaces localStorage with Supabase database calls
 */

import { supabaseClient } from '../supabaseClient';
import type { Task, Category, Attendee, ShareLink } from '@daypilot/types';

// LocalEvent type (matches DashboardPage)
interface LocalEvent {
  id: string;
  title: string;
  description: string | null;
  start: string;
  end: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  all_day?: boolean;
  color?: string | null;
  icon?: string | null;
  recurrence_rule?: string | null;
  recurrence_end_date?: string | null;
  parent_event_id?: string | null;
  category_id?: string | null;
  calendar_id?: string;
}

// ============================================
// EVENTS
// ============================================

export async function getEvents(): Promise<LocalEvent[]> {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabaseClient
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching events:', error);
      return [];
    }

    // Transform to LocalEvent format
    return (data || []).map((e: any) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      start: e.start_time,
      end: e.end_time,
      status: e.status,
      all_day: e.all_day || false,
      color: e.color,
      icon: e.icon,
      recurrence_rule: e.recurrence_rule ? JSON.stringify(e.recurrence_rule) : null,
      recurrence_end_date: e.recurrence_end_date,
      parent_event_id: e.parent_event_id,
      category_id: e.category_id,
      calendar_id: e.calendar_id,
    }));
  } catch (error) {
    console.error('Error in getEvents:', error);
    return [];
  }
}

export async function saveEvents(events: LocalEvent[]): Promise<void> {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    // Upsert events
    for (const event of events) {
      const eventData: any = {
        id: event.id,
        user_id: user.id,
        title: event.title,
        description: event.description,
        start_time: event.start,
        end_time: event.end,
        status: event.status,
        all_day: event.all_day || false,
        color: event.color,
        icon: event.icon,
        recurrence_rule: event.recurrence_rule ? (typeof event.recurrence_rule === 'string' ? JSON.parse(event.recurrence_rule) : event.recurrence_rule) : null,
        recurrence_end_date: event.recurrence_end_date,
        parent_event_id: event.parent_event_id,
        category_id: event.category_id,
        calendar_id: event.calendar_id || null,
      };
      
      const { error } = await supabaseClient
        .from('events')
        .upsert(eventData, {
          onConflict: 'id',
        });

      if (error) {
        console.error('Error saving event:', error);
      }
    }
  } catch (error) {
    console.error('Error in saveEvents:', error);
  }
}

// ============================================
// TASKS
// ============================================

export async function getTasks(): Promise<Task[]> {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabaseClient
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }

    return (data || []).map((t: any) => ({
      id: t.id,
      user_id: t.user_id,
      title: t.title,
      description: t.description,
      due_date: t.due_date,
      duration: t.duration_minutes,
      priority: t.priority,
      status: t.status,
      category_id: t.category_id,
      converted_to_event_id: t.scheduled_event_id,
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));
  } catch (error) {
    console.error('Error in getTasks:', error);
    return [];
  }
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    for (const task of tasks) {
      const { error } = await supabaseClient
        .from('tasks')
        .upsert({
          id: task.id,
          user_id: user.id,
          title: task.title,
          description: task.description,
          due_date: task.due_date,
          duration_minutes: task.duration,
          priority: task.priority,
          status: task.status,
          category_id: task.category_id,
          scheduled_event_id: task.converted_to_event_id,
        }, {
          onConflict: 'id',
        });

      if (error) {
        console.error('Error saving task:', error);
      }
    }
  } catch (error) {
    console.error('Error in saveTasks:', error);
  }
}

// ============================================
// CATEGORIES
// ============================================

export async function getCategories(): Promise<Category[]> {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabaseClient
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }

    return (data || []).map((c: any) => ({
      id: c.id,
      user_id: c.user_id,
      name: c.name,
      color: c.color,
      icon: c.icon,
      created_at: c.created_at,
    }));
  } catch (error) {
    console.error('Error in getCategories:', error);
    return [];
  }
}

export async function saveCategories(categories: Category[]): Promise<void> {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    for (const category of categories) {
      const { error } = await supabaseClient
        .from('categories')
        .upsert({
          id: category.id,
          user_id: user.id,
          name: category.name,
          color: category.color,
          icon: category.icon,
        }, {
          onConflict: 'id',
        });

      if (error) {
        console.error('Error saving category:', error);
      }
    }
  } catch (error) {
    console.error('Error in saveCategories:', error);
  }
}

// ============================================
// ATTENDEES
// ============================================

export async function getAttendees(): Promise<Attendee[]> {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return [];

    // Get attendees for events owned by user
    const { data, error } = await supabaseClient
      .from('attendees')
      .select(`
        *,
        events!inner (
          user_id
        )
      `)
      .eq('events.user_id', user.id);

    if (error) {
      console.error('Error fetching attendees:', error);
      return [];
    }

    return (data || []).map((a: any) => ({
      id: a.id,
      eventId: a.event_id,
      email: a.email,
      name: a.name,
      role: a.role,
      rsvpStatus: a.rsvp_status,
      inviteToken: a.invite_token,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    }));
  } catch (error) {
    console.error('Error in getAttendees:', error);
    return [];
  }
}

export async function saveAttendees(attendees: Attendee[]): Promise<void> {
  try {
    for (const attendee of attendees) {
      const { error } = await supabaseClient
        .from('attendees')
        .upsert({
          id: attendee.id,
          event_id: attendee.eventId,
          email: attendee.email,
          name: attendee.name,
          role: attendee.role,
          rsvp_status: attendee.rsvpStatus,
          invite_token: attendee.inviteToken,
        }, {
          onConflict: 'id',
        });

      if (error) {
        console.error('Error saving attendee:', error);
      }
    }
  } catch (error) {
    console.error('Error in saveAttendees:', error);
  }
}

// ============================================
// SHARE LINKS
// ============================================

export async function getShareLinks(): Promise<ShareLink[]> {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabaseClient
      .from('share_links')
      .select('*')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching share links:', error);
      return [];
    }

    return (data || []).map((s: any) => ({
      id: s.id,
      userId: s.user_id,
      token: s.token,
      mode: s.mode,
      createdAt: s.created_at,
      revokedAt: s.revoked_at,
    }));
  } catch (error) {
    console.error('Error in getShareLinks:', error);
    return [];
  }
}

export async function saveShareLinks(shareLinks: ShareLink[]): Promise<void> {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    for (const link of shareLinks) {
      const { error } = await supabaseClient
        .from('share_links')
        .upsert({
          id: link.id,
          user_id: user.id,
          token: link.token,
          mode: link.mode,
          revoked_at: link.revokedAt,
        }, {
          onConflict: 'id',
        });

      if (error) {
        console.error('Error saving share link:', error);
      }
    }
  } catch (error) {
    console.error('Error in saveShareLinks:', error);
  }
}

// ============================================
// PREFERENCES
// ============================================

export async function getUserPreferences(): Promise<{
  emailRemindersEnabled: boolean;
  defaultReminderMinutes: number;
  workingHours?: { start: number; end: number };
  timezone?: string;
}> {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return {
        emailRemindersEnabled: true,
        defaultReminderMinutes: 30,
      };
    }

    const { data, error } = await supabaseClient
      .from('preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching preferences:', error);
      return {
        emailRemindersEnabled: true,
        defaultReminderMinutes: 30,
      };
    }

    if (!data) {
      // Create default preferences
      const { data: newPrefs } = await supabaseClient
        .from('preferences')
        .insert({
          user_id: user.id,
          email_reminders_enabled: true,
          default_reminder_minutes: 30,
        })
        .select()
        .single();

      return {
        emailRemindersEnabled: newPrefs?.email_reminders_enabled ?? true,
        defaultReminderMinutes: newPrefs?.default_reminder_minutes ?? 30,
        workingHours: newPrefs?.working_hours as { start: number; end: number } | undefined,
        timezone: newPrefs?.timezone,
      };
    }

    return {
      emailRemindersEnabled: data.email_reminders_enabled ?? true,
      defaultReminderMinutes: data.default_reminder_minutes ?? 30,
      workingHours: data.working_hours as { start: number; end: number } | undefined,
      timezone: data.timezone,
    };
  } catch (error) {
    console.error('Error in getUserPreferences:', error);
    return {
      emailRemindersEnabled: true,
      defaultReminderMinutes: 30,
    };
  }
}

export async function saveUserPreferences(preferences: {
  emailRemindersEnabled: boolean;
  defaultReminderMinutes: number;
  workingHours?: { start: number; end: number };
  timezone?: string;
}): Promise<void> {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { error } = await supabaseClient
      .from('preferences')
      .upsert({
        user_id: user.id,
        email_reminders_enabled: preferences.emailRemindersEnabled,
        default_reminder_minutes: preferences.defaultReminderMinutes,
        working_hours: preferences.workingHours,
        timezone: preferences.timezone,
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('Error saving preferences:', error);
    }
  } catch (error) {
    console.error('Error in saveUserPreferences:', error);
  }
}

// ============================================
// TOKEN GENERATION
// ============================================

export async function generateShareToken(): Promise<string> {
  // Call Supabase function to generate token
  const { data, error } = await supabaseClient.rpc('generate_share_token');
  if (error || !data) {
    // Fallback to client-side generation
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  return data;
}

export async function generateInviteToken(): Promise<string> {
  // Call Supabase function to generate token
  const { data, error } = await supabaseClient.rpc('generate_invite_token');
  if (error || !data) {
    // Fallback to client-side generation
    const array = new Uint8Array(24);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  return data;
}
