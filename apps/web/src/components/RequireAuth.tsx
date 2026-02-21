import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseClient, isSupabaseConfigured, isApiMode, getApiConfig } from '@daypilot/lib';
import type { User } from '@supabase/supabase-js';
import { getStoredApiToken } from './InitApiAuth';

interface RequireAuthProps {
  children: React.ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const [user, setUser] = useState<User | null>(null);
  const [apiAuthenticated, setApiAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (isApiMode()) {
      const token = getStoredApiToken() ?? getApiConfig()?.getToken() ?? null;
      if (!token) {
        setLoading(false);
        setApiAuthenticated(false);
        navigate('/login');
        return;
      }
      setApiAuthenticated(true);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured()) {
      setLoading(false);
      navigate('/login');
      return;
    }

    let hasInitialized = false;

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      if (!hasInitialized) {
        hasInitialized = true;
        setLoading(false);
      }

      setUser(session?.user ?? null);

      if (hasInitialized && !session) {
        navigate('/login');
      }
    });

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

  if (isApiMode()) {
    if (apiAuthenticated !== true) return null;
    return <>{children}</>;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
