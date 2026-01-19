import { useEvents } from '@daypilot/lib';
import { formatTime, isToday } from '@daypilot/lib';
import { Card, Badge } from '@daypilot/ui';
import { AIQuickPlan } from '../../components/AIQuickPlan';
import { AISuggestions } from '../../components/AISuggestions';
import { AIRescheduler } from '../../components/AIRescheduler';
import { NaturalLanguageInput } from '../../components/NaturalLanguageInput';
import type { Event } from '@daypilot/types';

export function TodayPage() {
  const { data: events, isLoading, error, refetch } = useEvents();

  const todayEvents =
    events?.filter((event) => {
      const start = new Date(event.start);
      return isToday(start);
    }) || [];

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Today</h1>
        <Card>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Today</h1>
        <Card>
          <p className="text-red-600">Error loading events: {String(error)}</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Today</h1>

      {/* AI Quick Plan */}
      <div className="mb-6">
        <AIQuickPlan onScheduleGenerated={() => refetch()} />
      </div>

      {/* AI Suggestions */}
      <div className="mb-6">
        <AISuggestions />
      </div>

      {/* AI Rescheduler */}
      <div className="mb-6">
        <AIRescheduler />
      </div>

      {/* Natural Language Input */}
      <div className="mb-6">
        <NaturalLanguageInput />
      </div>

      {/* Today's Events */}
      {todayEvents.length === 0 ? (
        <Card>
          <p className="text-gray-600">No events scheduled for today.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {todayEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const isAiGenerated = event.description?.includes('AI-generated');

  return (
    <Card>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-semibold">{event.title}</h3>
            {isAiGenerated && (
              <Badge variant="success" className="text-xs">
                AI
              </Badge>
            )}
          </div>
          {event.description && (
            <p className="text-gray-600 mb-2">{event.description}</p>
          )}
          <p className="text-sm text-gray-500">
            {formatTime(start)} - {formatTime(end)}
          </p>
        </div>
        <Badge
          variant={
            event.status === 'completed'
              ? 'success'
              : event.status === 'cancelled'
                ? 'error'
                : 'default'
          }
        >
          {event.status}
        </Badge>
      </div>
    </Card>
  );
}
