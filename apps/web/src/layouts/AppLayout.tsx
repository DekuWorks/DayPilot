import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabaseClient } from '@daypilot/lib';
import { Button } from '@daypilot/ui';
import type { User } from '@supabase/supabase-js';

export function AppLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();
      setUser(user);
    };

    getUser();

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 md:p-6">
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-[#EFBF4D] to-[#4FB3B3] bg-clip-text text-transparent">
            DayPilot
          </h1>
        </div>
        <nav className="flex md:flex-col flex-row md:flex-1 px-4 space-y-2 md:space-y-2 space-x-2 md:space-x-0 overflow-x-auto">
          <Link
            to="/app/today"
            className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors whitespace-nowrap"
          >
            Today
          </Link>
          <Link
            to="/app/calendar"
            className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors whitespace-nowrap"
          >
            Calendar
          </Link>
          <Link
            to="/app/organizations"
            className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors whitespace-nowrap"
          >
            Organizations
          </Link>
          <Link
            to="/app/booking-links"
            className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors whitespace-nowrap"
          >
            Booking Links
          </Link>
          <Link
            to="/app/settings"
            className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors whitespace-nowrap"
          >
            Settings
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-800 space-y-4 hidden md:block">
          {user && (
            <div className="text-sm">
              <p className="font-medium truncate">{user.email}</p>
              {user.user_metadata?.name && (
                <p className="text-gray-400 truncate">
                  {user.user_metadata.name}
                </p>
              )}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="w-full !text-white !border-gray-700 hover:!bg-gray-800"
          >
            Log out
          </Button>
        </div>
      </aside>

      <main className="flex-1 bg-gray-50">
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
