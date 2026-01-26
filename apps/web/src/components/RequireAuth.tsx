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

    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);

      if (!session) {
        navigate('/login');
      }
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate('/login');
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
