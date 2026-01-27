import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'http://localhost:5174';
const REDIRECT_URI = `${FRONTEND_URL}/app/integrations/google/callback`;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async req => {
  // Log all requests for debugging
  console.log('Request received:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
  });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    console.log('Action:', action);

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use anon key for token validation (user JWTs are validated against anon key)
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
    // Use service role key for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === 'authorize') {
      console.log('Processing authorize action');
      
      // Get auth token from request
      const authHeader = req.headers.get('Authorization');
      console.log('Authorization header present:', !!authHeader);
      
      if (!authHeader) {
        console.error('No Authorization header provided');
        return new Response(
          JSON.stringify({ error: 'Unauthorized: No token provided' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      console.log('Token length:', token.length);
      console.log('Token preview:', token.substring(0, 20) + '...');
      
      if (!token) {
        console.error('Empty token in Authorization header');
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Invalid token format' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log('Validating token with Supabase (anon key for user JWT validation)...');
      
      // Validate user JWT with anon key client
      // User JWTs are signed with the anon key's JWT secret, not service role
      const {
        data: { user },
        error: authError,
      } = await supabaseAnon.auth.getUser(token);

      if (authError) {
        console.error('Auth error:', {
          message: authError.message,
          status: authError.status,
          name: authError.name,
          tokenLength: token.length,
        });
        return new Response(
          JSON.stringify({
            error: 'Unauthorized',
            details: authError.message,
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (!user) {
        console.error('No user returned from getUser');
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Invalid user' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log('User authenticated:', user.id);

      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return new Response(
          JSON.stringify({ error: 'Google OAuth not configured' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Generate OAuth URL
      const scopes = [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events',
      ];

      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: scopes.join(' '),
        access_type: 'offline',
        prompt: 'consent',
        state: user.id,
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

      return new Response(JSON.stringify({ url: authUrl }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state'); // user_id
      const error = url.searchParams.get('error');

      if (error) {
        return Response.redirect(
          `${FRONTEND_URL}/app/integrations?error=${encodeURIComponent(error)}`
        );
      }

      if (!code || !state) {
        return Response.redirect(
          `${FRONTEND_URL}/app/integrations?error=missing_code`
        );
      }

      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return Response.redirect(
          `${FRONTEND_URL}/app/integrations?error=oauth_not_configured`
        );
      }

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error('Token exchange error:', errorData);
        return Response.redirect(
          `${FRONTEND_URL}/app/integrations?error=token_exchange_failed`
        );
      }

      const tokens = await tokenResponse.json();

      // Get user info from Google
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        }
      );

      if (!userInfoResponse.ok) {
        return Response.redirect(
          `${FRONTEND_URL}/app/integrations?error=user_info_failed`
        );
      }

      const userInfo = await userInfoResponse.json();

      // Store connected account
      const tokenExpiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null;

      const { error: dbError } = await supabase
        .from('connected_accounts')
        .upsert(
          {
            user_id: state,
            provider: 'google',
            provider_account_id: userInfo.id,
            email: userInfo.email,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: tokenExpiresAt,
            scope: tokens.scope,
            is_active: true,
          },
          {
            onConflict: 'user_id,provider,provider_account_id',
          }
        );

      if (dbError) {
        console.error('Database error:', dbError);
        return Response.redirect(
          `${FRONTEND_URL}/app/integrations?error=database_error`
        );
      }

      return Response.redirect(
        `${FRONTEND_URL}/app/integrations?success=connected`
      );
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in google-oauth function:', error);
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
