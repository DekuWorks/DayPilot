import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabaseClient } from '@daypilot/lib';
import { Button } from '@daypilot/ui';
import type { User } from '@supabase/supabase-js';
import { useLocation } from 'react-router-dom';

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const isDashboard =
    location.pathname === '/app' || location.pathname === '/app/';

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

  const handleNewEvent = () => {
    // Always navigate to dashboard and trigger event
    if (!isDashboard) {
      navigate('/app');
      // Wait a bit for navigation, then trigger
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('create-event'));
      }, 100);
    } else {
      window.dispatchEvent(new CustomEvent('create-event'));
    }
  };

  const handleConnect = () => {
    navigate('/app/integrations');
  };

  const handleShareLinks = () => {
    navigate('/app/share-links');
  };

  return (
    <div className="min-h-screen">
      {/* Navigation Bar - Matching Schedura Style */}
      <nav className="section-padding py-4 md:py-6 flex justify-between items-center sticky top-0 z-50 glass-effect border-b border-white/20">
        <Link
          to="/"
          className="text-xl md:text-2xl font-bold gradient-text hover:opacity-80 transition-opacity flex items-center gap-2"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          DayPilot
        </Link>

        <div className="flex items-center gap-3">
          {/* Action Buttons */}
          <Button
            onClick={handleNewEvent}
            size="lg"
            className="!bg-[#059669] !text-white hover:!bg-[#047857] shadow-sm !px-6 whitespace-nowrap !flex !items-center !gap-2"
          >
            <span className="text-lg font-bold">+</span>
            <span>New</span>
          </Button>
          <Button
            onClick={handleConnect}
            variant="outline"
            size="lg"
            className="!bg-[#3B82F6] !text-white !border-[#3B82F6] hover:!bg-[#2563EB] shadow-sm !px-6 whitespace-nowrap !flex !items-center !gap-2"
          >
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            <span>Connect</span>
          </Button>
          <Button
            onClick={handleShareLinks}
            variant="outline"
            size="lg"
            className="!bg-gray-700 !text-white !border-gray-700 hover:!bg-gray-600 shadow-sm !px-6 whitespace-nowrap !flex !items-center !gap-2"
          >
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            <span>Share Links</span>
          </Button>

          {/* User Info */}
          {user && (
            <div className="hidden md:flex items-center gap-3 ml-4 pl-4 border-l border-white/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#EFBF4D] to-[#4FB3B3] flex items-center justify-center text-white font-semibold text-sm">
                  {user.user_metadata?.name?.charAt(0)?.toUpperCase() ||
                    user.email?.charAt(0)?.toUpperCase() ||
                    'U'}
                </div>
                <span className="text-sm text-[#2B3448] font-medium">
                  {user.user_metadata?.name || user.email?.split('@')[0]}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-[#4FB3B3] hover:text-[#EFBF4D] transition-colors"
              >
                Sign out
              </button>
            </div>
          )}

          {/* Mobile menu */}
          <div className="md:hidden flex items-center gap-2">
            {user && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#EFBF4D] to-[#4FB3B3] flex items-center justify-center text-white font-semibold text-sm">
                {user.user_metadata?.name?.charAt(0)?.toUpperCase() ||
                  user.email?.charAt(0)?.toUpperCase() ||
                  'U'}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-[#4FB3B3] hover:text-[#EFBF4D] transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-80px)]">
        <Outlet />
      </main>
    </div>
  );
}
