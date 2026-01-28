import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { google } from 'https://esm.sh/googleapis@126.0.1';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async req => {
  // CRITICAL: Handle CORS preflight requests FIRST, before any other logic
  // This must be at the very top to work with verify_jwt=true
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS preflight request received');
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  console.log('Request received:', {
    method: req.method,
    url: req.url,
    hasAuth: !!req.headers.get('Authorization'),
    headers: Object.fromEntries(req.headers.entries()),
  });

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { connectedAccountId } = body;

    // Get connected account from connected_accounts table (if connectedAccountId provided)
    let account: any = null;
    
    if (connectedAccountId) {
      const { data: accountData, error: accountError } = await supabase
        .from('connected_accounts')
        .select('*')
        .eq('id', connectedAccountId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!accountError && accountData) {
        account = accountData;
      }
    }

    // Fallback: If not found in connected_accounts or no ID provided, try google_accounts table
    if (!account) {
      console.log('Account not found in connected_accounts, trying google_accounts...');
      const { data: googleAccount, error: googleAccountError } = await supabase
        .from('google_accounts')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (googleAccountError || !googleAccount) {
        return new Response(
          JSON.stringify({ error: 'Google account not found. Please reconnect your Google account.' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Convert google_accounts format to match connected_accounts format
      account = {
        id: googleAccount.user_id, // Use user_id as id for compatibility
        user_id: googleAccount.user_id,
        provider: 'google',
        access_token: googleAccount.access_token,
        refresh_token: googleAccount.refresh_token,
        token_expires_at: googleAccount.expires_at,
        scope: googleAccount.scope,
        is_active: true,
      };
    }

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

    // Initialize Google Calendar API
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    // List all calendars
    const { data: calendarsResponse } = await calendar.calendarList.list();
    const calendars = calendarsResponse.items || [];

    const createdMappings: any[] = [];

    // For each Google calendar, create a DayPilot calendar and mapping
    for (const googleCalendar of calendars) {
      // Skip calendars user doesn't have access to write
      if (
        googleCalendar.accessRole === 'freeBusyReader' ||
        !googleCalendar.id
      ) {
        continue;
      }

      // Check if mapping already exists
      const { data: existingMapping } = await supabase
        .from('calendar_mappings')
        .select('id')
        .eq('connected_account_id', connectedAccountId)
        .eq('provider_calendar_id', googleCalendar.id)
        .single();

      if (existingMapping) {
        continue; // Skip if already mapped
      }

      // Get or create DayPilot calendar
      let daypilotCalendarId: string;

      // Check if user has a calendar with this name
      const { data: existingDaypilotCalendar } = await supabase
        .from('calendars')
        .select('id')
        .eq('owner_id', user.id)
        .eq('name', googleCalendar.summary || 'Google Calendar')
        .single();

      if (existingDaypilotCalendar) {
        daypilotCalendarId = existingDaypilotCalendar.id;
      } else {
        // Create new DayPilot calendar
        const { data: newCalendar, error: calendarError } = await supabase
          .from('calendars')
          .insert({
            owner_id: user.id,
            name: googleCalendar.summary || 'Google Calendar',
            description: googleCalendar.description || null,
            color: googleCalendar.backgroundColor || '#4FB3B3',
            is_default: false,
            scope: 'user',
          })
          .select('id')
          .single();

        if (calendarError || !newCalendar) {
          console.error('Error creating calendar:', calendarError);
          continue;
        }

        daypilotCalendarId = newCalendar.id;
      }

      // Create calendar mapping
      const { data: mapping, error: mappingError } = await supabase
        .from('calendar_mappings')
        .insert({
          connected_account_id: connectedAccountId,
          daypilot_calendar_id: daypilotCalendarId,
          provider_calendar_id: googleCalendar.id,
          provider_calendar_name: googleCalendar.summary || 'Untitled Calendar',
          sync_enabled: true,
          sync_direction: 'bidirectional',
        })
        .select('id, provider_calendar_name')
        .single();

      if (mappingError) {
        console.error('Error creating mapping:', mappingError);
        continue;
      }

      createdMappings.push(mapping);
    }

    return new Response(
      JSON.stringify({
        success: true,
        calendarsDiscovered: calendars.length,
        mappingsCreated: createdMappings.length,
        mappings: createdMappings,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in google-discover function:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
