import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button } from '@daypilot/ui';
import {
  useAttendeeByToken,
  useUpdateRSVP,
  getEvents,
} from '@daypilot/lib';
import type { RSVPStatus } from '@daypilot/types';

type LocalEvent = {
  id: string;
  title: string;
  description: string | null;
  start: string;
  end: string;
  all_day?: boolean;
  location?: string | null;
};

export function RSVPPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { data: attendee, isLoading, error } = useAttendeeByToken(token || null);
  const updateRSVP = useUpdateRSVP();
  const [rsvpStatus, setRsvpStatus] = useState<RSVPStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [event, setEvent] = useState<LocalEvent | null>(null);

  // Load event details
  useEffect(() => {
    const loadEvent = async () => {
      if (attendee?.eventId) {
        const events = await getEvents();
        const foundEvent = events.find(e => e.id === attendee.eventId);
        if (foundEvent) {
          setEvent(foundEvent);
        }
      }
    };
    loadEvent();
  }, [attendee]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5E6D3' }}>
        <Card>
          <div className="animate-pulse space-y-4 p-8">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </Card>
      </div>
    );
  }

  if (error || !attendee) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5E6D3' }}>
        <Card>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-[#2B3448] mb-4">Invalid RSVP Link</h1>
            <p className="text-gray-600 mb-6">
              This RSVP link is invalid or has expired.
            </p>
            <Button onClick={() => navigate('/')}>Go to Home</Button>
          </div>
        </Card>
      </div>
    );
  }

  const handleRSVP = async (status: RSVPStatus) => {
    setIsSubmitting(true);
    try {
      await updateRSVP.mutateAsync({
        attendeeId: attendee.id,
        eventId: attendee.eventId,
        rsvpStatus: status,
      });
      setRsvpStatus(status);
      
      // Notify organizer of RSVP update via Edge Function
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co') {
          // Call Edge Function to send RSVP update email
          fetch(`${supabaseUrl}/functions/v1/send-rsvp-update`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              attendeeId: attendee.id,
              rsvpStatus: status,
            }),
          }).catch((err) => {
            console.error('Error triggering RSVP update email:', err);
            // Don't block RSVP update if email fails
          });
        }
      } catch (emailError) {
        console.error('Failed to send RSVP update email:', emailError);
        // Don't block RSVP update if email fails
      }
    } catch (error: any) {
      alert('Failed to update RSVP: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const currentStatus = rsvpStatus || attendee.rsvpStatus;

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8" style={{ background: '#F5E6D3' }}>
      <div className="max-w-2xl mx-auto">
        <Card className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#2B3448] mb-2">RSVP</h1>
            <p className="text-lg text-[#4f4f4f]">
              {attendee.name || attendee.email}
            </p>
          </div>

          {/* Event Details */}
          {event && (
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-[#2B3448] mb-4">Event Details</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Event</p>
                  <p className="font-medium text-[#2B3448]">{event.title}</p>
                </div>
                {event.description && (
                  <div>
                    <p className="text-sm text-gray-600">Description</p>
                    <p className="font-medium text-[#2B3448]">{event.description}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Date & Time</p>
                  <p className="font-medium text-[#2B3448]">
                    {formatDate(event.start)}
                    {' - '}
                    {new Date(event.end).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Current Status */}
          {currentStatus !== 'pending' && (
            <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
              <p className="text-sm font-semibold text-blue-800">
                Current Status: {currentStatus === 'going' ? 'Going' :
                                 currentStatus === 'maybe' ? 'Maybe' :
                                 currentStatus === 'declined' ? 'Declined' : 'Pending'}
              </p>
            </div>
          )}

          {/* RSVP Buttons */}
          {currentStatus === 'pending' || rsvpStatus ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-[#2B3448] mb-4 text-center">
                Will you be attending?
              </p>
              <div className="grid grid-cols-1 gap-3">
                <Button
                  onClick={() => handleRSVP('going')}
                  disabled={isSubmitting || currentStatus === 'going'}
                  className={`w-full ${
                    currentStatus === 'going'
                      ? '!bg-green-600 !text-white'
                      : 'hover:!bg-green-50'
                  }`}
                >
                  ✓ Going
                </Button>
                <Button
                  onClick={() => handleRSVP('maybe')}
                  disabled={isSubmitting || currentStatus === 'maybe'}
                  variant="outline"
                  className={`w-full ${
                    currentStatus === 'maybe'
                      ? '!bg-yellow-100 !border-yellow-500'
                      : ''
                  }`}
                >
                  ? Maybe
                </Button>
                <Button
                  onClick={() => handleRSVP('declined')}
                  disabled={isSubmitting || currentStatus === 'declined'}
                  variant="outline"
                  className={`w-full ${
                    currentStatus === 'declined'
                      ? '!bg-red-100 !border-red-500'
                      : ''
                  }`}
                >
                  ✗ Can't Attend
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#2B3448] mb-2">RSVP Updated!</h2>
              <p className="text-gray-600 mb-6">
                Your response has been recorded.
              </p>
              <Button onClick={() => navigate('/')}>Done</Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
