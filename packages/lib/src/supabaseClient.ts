import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Only create client if we have real credentials
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Persist session across page refreshes
    autoRefreshToken: true, // Automatically refresh expired tokens
    detectSessionInUrl: true, // Detect session in URL (for OAuth callbacks)
  },
});

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return (
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    import.meta.env.VITE_SUPABASE_ANON_KEY !== 'placeholder-key'
  );
};
