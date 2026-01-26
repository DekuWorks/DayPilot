import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import { useShareLinkByToken } from '@daypilot/lib';
import type { ShareMode } from '@daypilot/types';
import { Card } from '@daypilot/ui';

type LocalEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  all_day?: boolean;
  description?: string | null;
  location?: string | null;
};

/**
 * Transform events for privacy based on share mode
 */
function transformEventsForPrivacy(
  events: LocalEvent[],
  mode: ShareMode
): Array<{
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}> {
  if (mode === 'readOnly') {
    // Read-only: show all event details
    return events
      .filter(e => !e.all_day)
      .map(e => ({
        id: e.id,
        title: e.title,
        start: new Date(e.start),
        end: new Date(e.end),
        allDay: false,
        backgroundColor: '#E0F2F1',
        borderColor: '#059669',
        textColor: '#004D40',
      }));
  } else {
    // Busy-only: replace titles with "Busy", hide details
    return events
      .filter(e => !e.all_day)
      .map(e => ({
        id: e.id,
        title: 'Busy',
        start: new Date(e.start),
        end: new Date(e.end),
        allDay: false,
        backgroundColor: '#E5E7EB',
        borderColor: '#6B7280',
        textColor: '#374151',
      }));
  }
}

export function SharePage() {
  const { token } = useParams<{ token: string }>();
  const { data: shareLink, isLoading, error } = useShareLinkByToken(token || null);
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [currentView, setCurrentView] = useState('timeGridWeek');

  useEffect(() => {
    if (shareLink) {
      // Load events for the share link owner from Supabase
      const loadOwnerEvents = async () => {
        try {
          const { supabaseClient } = await import('@daypilot/lib');
          
          // Get calendars for the share link owner
          const { data: calendars, error: calendarsError } = await supabaseClient
            .from('calendars')
            .select('id')
            .eq('owner_id', shareLink.userId);

          if (calendarsError || !calendars || calendars.length === 0) {
            setEvents([]);
            return;
          }

          const calendarIds = calendars.map(c => c.id);

          // Get events for those calendars
          const { data: eventsData, error: eventsError } = await supabaseClient
            .from('events')
            .select('*')
            .in('calendar_id', calendarIds)
            .order('start_time', { ascending: true });

          if (eventsError) {
            console.error('Error loading events:', eventsError);
            setEvents([]);
            return;
          }

          // Transform to LocalEvent format
          const transformedEvents: LocalEvent[] = (eventsData || []).map((e: any) => ({
            id: e.id,
            title: e.title,
            start: e.start_time || e.start,
            end: e.end_time || e.end,
            all_day: e.all_day || false,
            description: e.description,
            location: e.location,
          }));

          setEvents(transformedEvents);
        } catch (error) {
          console.error('Error loading owner events:', error);
          setEvents([]);
        }
      };

      loadOwnerEvents();
    }
  }, [shareLink]);

  if (isLoading) {
    return (
      <div className="min-h-screen py-6">
        <div className="dashboard-shell">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4FB3B3] mx-auto mb-4"></div>
              <p className="text-[var(--muted)]">Loading calendar...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !shareLink) {
    return (
      <div className="min-h-screen py-6">
        <div className="dashboard-shell">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-[var(--text)] mb-4">Link Not Found</h1>
            <p className="text-[var(--muted)]">
              This share link is invalid or has been revoked.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const transformedEvents = transformEventsForPrivacy(events, shareLink.mode);

  return (
    <>
      {/* SEO / Privacy Meta Tags */}
      <head>
        <meta name="robots" content="noindex, nofollow" />
      </head>

      <div className="min-h-screen py-6">
        <div className="dashboard-shell">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-[var(--text)] mb-2">
                  Shared Calendar
                </h1>
                <p className="text-[var(--muted)]">
                  {shareLink.mode === 'busyOnly'
                    ? 'Busy/free availability view'
                    : 'Read-only calendar view'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentView('timeGridWeek')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentView === 'timeGridWeek'
                      ? 'bg-[var(--text)] text-white'
                      : 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border)]'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setCurrentView('dayGridMonth')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentView === 'dayGridMonth'
                      ? 'bg-[var(--text)] text-white'
                      : 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border)]'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setCurrentView('listWeek')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentView === 'listWeek'
                      ? 'bg-[var(--text)] text-white'
                      : 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border)]'
                  }`}
                >
                  Agenda
                </button>
              </div>
            </div>
          </div>

          <Card className="p-6">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
              initialView={currentView}
              headerToolbar={false}
              events={transformedEvents}
              height="auto"
              dayMaxEvents={true}
              moreLinkClick="popover"
              nowIndicator={true}
              slotMinTime="06:00:00"
              slotMaxTime="22:00:00"
              allDaySlot={true}
              firstDay={0}
              eventDisplay="block"
              eventTimeFormat={{
                hour: 'numeric',
                minute: '2-digit',
                meridiem: 'short',
              }}
              editable={false}
              selectable={false}
            />
          </Card>
        </div>
      </div>
    </>
  );
}
