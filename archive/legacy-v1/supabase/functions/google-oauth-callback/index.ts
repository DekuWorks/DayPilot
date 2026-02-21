import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const GOOGLE_REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI');
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || 'https://daypilot.co';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
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

    // Initialize Supabase client (service role for database operations)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse query parameters
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const stateParam = url.searchParams.get('state') || '';
    const error = url.searchParams.get('error');

    // Parse state: format is "user_id|return_path" or just "return_path"
    // If state contains user_id, use it; otherwise we'll need to get user from session
    let userId: string | null = null;
    let returnPath = '/app/integrations';

    if (stateParam.includes('|')) {
      const [uid, path] = stateParam.split('|');
      userId = uid;
      returnPath = path || '/app/integrations';
    } else {
      returnPath = stateParam || '/app/integrations';
    }

    if (error) {
      return Response.redirect(
        `${APP_BASE_URL}${returnPath}?error=${encodeURIComponent(error)}`,
        302
      );
    }

    if (!code) {
      return Response.redirect(
        `${APP_BASE_URL}${returnPath}?error=missing_code`,
        302
      );
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      return Response.redirect(
        `${APP_BASE_URL}${returnPath}?error=oauth_not_configured`,
        302
      );
    }

    // If no user_id in state, we can't proceed - redirect with error
    if (!userId) {
      return Response.redirect(
        `${APP_BASE_URL}${returnPath}?error=missing_user_id`,
        302
      );
    }

    // Verify user exists by querying auth.users (service role can access this)
    // We'll validate by attempting the insert - foreign key will fail if user doesn't exist
    // For now, we'll proceed and let the database constraint validate

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
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange error:', errorData);
      return Response.redirect(
        `${APP_BASE_URL}${returnPath}?error=token_exchange_failed`,
        302
      );
    }

    const tokens = await tokenResponse.json();

    // Get user info from Google (optional - we have user_id from state)
    let userInfo: { id?: string; email?: string } = {};
    try {
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        }
      );

      if (userInfoResponse.ok) {
        userInfo = await userInfoResponse.json();
      } else {
        console.warn(
          'Failed to fetch user info, continuing anyway:',
          await userInfoResponse.text()
        );
        // Continue without user info - we have user_id from state
      }
    } catch (error) {
      console.warn('Error fetching user info, continuing anyway:', error);
      // Continue without user info
    }

    // Calculate token expiration
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString(); // Default 1 hour

    // Store tokens in database
    console.log('Storing tokens for user:', userId);
    const { error: dbError, data: googleAccountData } = await supabase
      .from('google_accounts')
      .upsert(
        {
          user_id: userId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt,
          scope: tokens.scope,
          token_type: tokens.token_type || 'Bearer',
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )
      .select();

    if (dbError) {
      console.error('Database error storing google_accounts:', dbError);
      return Response.redirect(
        `${APP_BASE_URL}${returnPath}?error=database_error`,
        302
      );
    }

    console.log('Successfully stored in google_accounts:', googleAccountData);

    // Also update connected_accounts table for backward compatibility
    // Use user_id as provider_account_id if we don't have userInfo.id
    // Email is required, so use a placeholder if we don't have it
    console.log('Storing in connected_accounts table...');
    const providerAccountId = userInfo.id || userId;
    const email = userInfo.email || `${userId}@google.oauth`; // Fallback email since NOT NULL

    const { error: connectedAccountError, data: connectedAccountData } =
      await supabase
        .from('connected_accounts')
        .upsert(
          {
            user_id: userId,
            provider: 'google',
            provider_account_id: providerAccountId,
            email: email,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: expiresAt,
            scope: tokens.scope,
            is_active: true,
          },
          {
            onConflict: 'user_id,provider,provider_account_id',
          }
        )
        .select();

    if (connectedAccountError) {
      console.error(
        'Database error storing connected_accounts:',
        connectedAccountError
      );
      // Log but don't fail - google_accounts was stored successfully
      // The app can work with just google_accounts table
    } else {
      console.log(
        'Successfully stored in connected_accounts:',
        connectedAccountData
      );
    }

    // Redirect back to app
    return Response.redirect(
      `${APP_BASE_URL}${returnPath}?success=connected`,
      302
    );
  } catch (error: any) {
    console.error('Error in google-oauth-callback:', error);
    return Response.redirect(
      `${APP_BASE_URL}/app/integrations?error=internal_error`,
      302
    );
  }
});
