import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI');
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || 'https://daypilot.co';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async req => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
      return new Response(
        JSON.stringify({ error: 'Google OAuth not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get state parameter (return path after OAuth)
    const url = new URL(req.url);
    const returnPath = url.searchParams.get('state') || '/app/integrations';
    
    // Get user_id from query param (frontend will pass it)
    // Format: state will be "user_id|return_path" or just "return_path"
    const userId = url.searchParams.get('user_id');
    
    // Build state parameter for Google OAuth
    // Format: "user_id|return_path" so callback can extract both
    const state = userId ? `${userId}|${returnPath}` : returnPath;

    // Build Google OAuth URL
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state: state,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    // Redirect to Google OAuth
    return Response.redirect(authUrl, 302);
  } catch (error: any) {
    console.error('Error in google-oauth-authorize:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
