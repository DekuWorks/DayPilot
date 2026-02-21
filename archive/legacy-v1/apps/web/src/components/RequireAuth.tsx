import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseClient, isSupabaseConfigured } from '@daypilot/lib';
import type { User } from '@supabase/supabase-js';

interface RequireAuthProps {
  children: React.ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      navigate('/login');
      return;
    }

    // Wait for initial auth state change to ensure session is restored from storage
    // This is critical for session persistence to work on page refresh
    let hasInitialized = false;

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      // Wait for the initial session restoration event
      if (!hasInitialized) {
        hasInitialized = true;
        setLoading(false);
      }

      setUser(session?.user ?? null);

      // Only navigate to login if we've initialized and there's no session
      if (hasInitialized && !session) {
        navigate('/login');
      }
    });

    // Also check session immediately as a fallback
    // But don't navigate until we've heard from onAuthStateChange
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (hasInitialized) {
        setUser(session?.user ?? null);
        if (!session) {
          navigate('/login');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
