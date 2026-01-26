import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { google } from 'https://esm.sh/googleapis@126.0.1';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

serve(async req => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { calendarMappingId } = body;

    // Get calendar mapping
    const { data: mapping, error: mappingError } = await supabase
      .from('calendar_mappings')
      .select(
        `
        id,
        connected_account_id,
        daypilot_calendar_id,
        provider_calendar_id,
        connected_accounts!inner(
          id,
          provider_account_id,
          access_token,
          refresh_token,
          token_expires_at
        )
      `
      )
      .eq('id', calendarMappingId)
      .single();

    if (mappingError || !mapping) {
      return new Response(
        JSON.stringify({ error: 'Calendar mapping not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const account = (mapping as any).connected_accounts;

    // Check and refresh token if needed
    let accessToken = account.access_token;
    const expiresAt = account.token_expires_at
      ? new Date(account.token_expires_at)
      : null;
    const isExpired = expiresAt && expiresAt.getTime() < Date.now() + 60000;

    if (isExpired && account.refresh_token) {
      // Refresh token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          refresh_token: account.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (tokenResponse.ok) {
        const tokens = await tokenResponse.json();
        accessToken = tokens.access_token;

        // Update stored token
        await supabase
          .from('connected_accounts')
          .update({
            access_token: tokens.access_token,
            token_expires_at: tokens.expires_in
              ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
              : null,
          })
          .eq('id', account.id);
      }
    }

    // Get sync token if exists
    const { data: syncState } = await supabase
      .from('sync_state')
      .select('sync_token')
      .eq('calendar_mapping_id', mapping.id)
      .single();

    // Initialize Google Calendar API
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    // Fetch events
    const params: any = {
      calendarId: mapping.provider_calendar_id,
      maxResults: 2500,
      singleEvents: true,
      orderBy: 'startTime',
    };

    if (syncState?.sync_token) {
      params.syncToken = syncState.sync_token;
    } else {
      const timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - 30);
      params.timeMin = timeMin.toISOString();
    }

    const { data: eventsResponse } = await calendar.events.list(params);
    const events = eventsResponse.items || [];
    const nextSyncToken = eventsResponse.nextSyncToken;

    let imported = 0;
    let updated = 0;

    // Process events
    for (const event of events || []) {
      if (!event.id || event.status === 'cancelled') continue;

      const startTime = event.start?.dateTime || event.start?.date;
      const endTime = event.end?.dateTime || event.end?.date;

      if (!startTime || !endTime) continue;

      const start = new Date(startTime);
      const end = new Date(endTime);

      // Check if event exists
      const { data: existingMapping } = await supabase
        .from('event_mappings')
        .select('daypilot_event_id')
        .eq('calendar_mapping_id', mapping.id)
        .eq('provider_event_id', event.id)
        .single();

      const eventData = {
        calendar_id: mapping.daypilot_calendar_id,
        title: event.summary || 'Untitled Event',
        description: event.description || null,
        start: start.toISOString(),
        end: end.toISOString(),
        status: 'scheduled' as const,
        timezone: event.start?.timeZone || null,
      };

      if (existingMapping) {
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
        const { data: newEvent } = await supabase
          .from('events')
          .insert(eventData)
          .select('id')
          .single();

        if (newEvent) {
          await supabase.from('event_mappings').insert({
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
      await supabase.from('sync_state').upsert(
        {
          calendar_mapping_id: mapping.id,
          sync_token: nextSyncToken,
          last_sync_at: new Date().toISOString(),
          sync_status: 'idle',
        },
        {
          onConflict: 'calendar_mapping_id',
        }
      );
    }

    // Update calendar mapping
    await supabase
      .from('calendar_mappings')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', mapping.id);

    return new Response(
      JSON.stringify({
        success: true,
        imported,
        updated,
        totalEvents: events.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in google-sync function:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
