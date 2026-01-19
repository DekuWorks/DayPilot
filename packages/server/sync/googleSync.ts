import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { getAccessToken } from '../providers/google';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface GoogleEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; endDate?: string; timeZone?: string };
  etag: string;
  status?: string;
}

/**
 * Get Google Calendar API client
 */
async function getCalendarClient(userId: string, providerAccountId: string) {
  const accessToken = await getAccessToken(userId, providerAccountId);
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: 'v3', auth });
}

/**
 * List Google calendars for a user
 */
export async function listGoogleCalendars(
  userId: string,
  providerAccountId: string
): Promise<Array<{ id: string; summary: string; primary?: boolean }>> {
  const calendar = await getCalendarClient(userId, providerAccountId);
  const { data } = await calendar.calendarList.list();

  return (data.items || []).map((cal) => ({
    id: cal.id!,
    summary: cal.summary || 'Untitled Calendar',
    primary: cal.primary || false,
  }));
}

/**
 * Import Google calendar events into DayPilot
 */
export async function importGoogleCalendar(
  userId: string,
  connectedAccountId: string,
  providerCalendarId: string,
  daypilotCalendarId: string,
  syncToken?: string
): Promise<{
  imported: number;
  updated: number;
  syncToken?: string;
}> {
  // Get connected account
  const { data: account } = await supabase
    .from('connected_accounts')
    .select('provider_account_id')
    .eq('id', connectedAccountId)
    .eq('user_id', userId)
    .single();

  if (!account) {
    throw new Error('Connected account not found');
  }

  const calendar = await getCalendarClient(userId, account.provider_account_id);

  // Get or create calendar mapping
  let { data: mapping } = await supabase
    .from('calendar_mappings')
    .select('id')
    .eq('connected_account_id', connectedAccountId)
    .eq('provider_calendar_id', providerCalendarId)
    .single();

  if (!mapping) {
    const { data: newMapping } = await supabase
      .from('calendar_mappings')
      .insert({
        connected_account_id: connectedAccountId,
        daypilot_calendar_id: daypilotCalendarId,
        provider_calendar_id: providerCalendarId,
      })
      .select('id')
      .single();

    mapping = newMapping;
  }

  if (!mapping) {
    throw new Error('Failed to create calendar mapping');
  }

  // Fetch events from Google
  const params: any = {
    calendarId: providerCalendarId,
    maxResults: 2500,
    singleEvents: true,
    orderBy: 'startTime',
  };

  if (syncToken) {
    params.syncToken = syncToken;
  } else {
    // Initial sync - get events from last 30 days and future
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 30);
    params.timeMin = timeMin.toISOString();
  }

  const { data: eventsResponse } = await calendar.events.list(params);
  const events = eventsResponse.items || [];
  const nextSyncToken = eventsResponse.nextSyncToken;

  let imported = 0;
  let updated = 0;

  // Process each event
  for (const event of events) {
    if (!event.id || event.status === 'cancelled') {
      // Skip cancelled events or events without ID
      continue;
    }

    // Check if event already exists
    const { data: existingMapping } = await supabase
      .from('event_mappings')
      .select('daypilot_event_id')
      .eq('calendar_mapping_id', mapping.id)
      .eq('provider_event_id', event.id)
      .single();

    // Parse event times
    const startTime = event.start?.dateTime || event.start?.date;
    const endTime = event.end?.dateTime || event.end?.date;

    if (!startTime || !endTime) {
      continue; // Skip events without valid times
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    const eventData = {
      calendar_id: daypilotCalendarId,
      title: event.summary || 'Untitled Event',
      description: event.description || null,
      start: start.toISOString(),
      end: end.toISOString(),
      status: 'scheduled' as const,
      timezone: event.start?.timeZone || null,
    };

    if (existingMapping) {
      // Update existing event
      await supabase
        .from('events')
        .update(eventData)
        .eq('id', existingMapping.daypilot_event_id);

      await supabase
        .from('event_mappings')
        .update({
          provider_etag: event.etag,
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', existingMapping.daypilot_event_id);

      updated++;
    } else {
      // Create new event
      const { data: newEvent } = await supabase
        .from('events')
        .insert(eventData)
        .select('id')
        .single();

      if (newEvent) {
        await supabase
          .from('event_mappings')
          .insert({
            calendar_mapping_id: mapping.id,
            daypilot_event_id: newEvent.id,
            provider_event_id: event.id,
            provider_etag: event.etag,
          });

        imported++;
      }
    }
  }

  // Update sync state
  if (nextSyncToken) {
    await supabase
      .from('sync_state')
      .upsert({
        calendar_mapping_id: mapping.id,
        sync_token: nextSyncToken,
        last_sync_at: new Date().toISOString(),
        sync_status: 'idle',
      }, {
        onConflict: 'calendar_mapping_id',
      });
  }

  // Update calendar mapping last_synced_at
  await supabase
    .from('calendar_mappings')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', mapping.id);

  return {
    imported,
    updated,
    syncToken: nextSyncToken,
  };
}

/**
 * Sync all calendars for a user
 */
export async function syncAllCalendars(userId: string): Promise<{
  totalImported: number;
  totalUpdated: number;
  errors: string[];
}> {
  // Get all active connected accounts
  const { data: accounts } = await supabase
    .from('connected_accounts')
    .select('id, provider_account_id')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .eq('is_active', true);

  if (!accounts || accounts.length === 0) {
    return { totalImported: 0, totalUpdated: 0, errors: [] };
  }

  let totalImported = 0;
  let totalUpdated = 0;
  const errors: string[] = [];

  for (const account of accounts) {
    try {
      // Get calendar mappings for this account
      const { data: mappings } = await supabase
        .from('calendar_mappings')
        .select('id, daypilot_calendar_id, provider_calendar_id, sync_enabled')
        .eq('connected_account_id', account.id)
        .eq('sync_enabled', true);

      if (!mappings) continue;

      // Get sync token if exists
      for (const mapping of mappings) {
        const { data: syncState } = await supabase
          .from('sync_state')
          .select('sync_token')
          .eq('calendar_mapping_id', mapping.id)
          .single();

        try {
          const result = await importGoogleCalendar(
            userId,
            account.id,
            mapping.provider_calendar_id,
            mapping.daypilot_calendar_id,
            syncState?.sync_token
          );

          totalImported += result.imported;
          totalUpdated += result.updated;
        } catch (error: any) {
          errors.push(`Calendar ${mapping.provider_calendar_id}: ${error.message}`);
        }
      }
    } catch (error: any) {
      errors.push(`Account ${account.id}: ${error.message}`);
    }
  }

  return { totalImported, totalUpdated, errors };
}
