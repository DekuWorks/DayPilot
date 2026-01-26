import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button } from '@daypilot/ui';
import { useBookingLinkBySlug } from '@daypilot/lib';
import type { Booking } from '@daypilot/types';

/**
 * Generate .ics file content for calendar download
 */
function generateICS(
  title: string,
  description: string,
  start: Date,
  end: Date,
  location?: string,
  organizerEmail?: string,
  attendeeEmail?: string
): string {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  let ics = 'BEGIN:VCALENDAR\r\n';
  ics += 'VERSION:2.0\r\n';
  ics += 'PRODID:-//DayPilot//Booking//EN\r\n';
  ics += 'CALSCALE:GREGORIAN\r\n';
  ics += 'METHOD:REQUEST\r\n';
  ics += 'BEGIN:VEVENT\r\n';
  ics += `UID:${Date.now()}@daypilot.app\r\n`;
  ics += `DTSTAMP:${formatDate(new Date())}\r\n`;
  ics += `DTSTART:${formatDate(start)}\r\n`;
  ics += `DTEND:${formatDate(end)}\r\n`;
  ics += `SUMMARY:${title}\r\n`;
  ics += `DESCRIPTION:${description.replace(/\n/g, '\\n')}\r\n`;
  if (location) {
    ics += `LOCATION:${location}\r\n`;
  }
  if (organizerEmail) {
    ics += `ORGANIZER;CN=Organizer:mailto:${organizerEmail}\r\n`;
  }
  if (attendeeEmail) {
    ics += `ATTENDEE;CN=Attendee;RSVP=TRUE:mailto:${attendeeEmail}\r\n`;
  }
  ics += 'STATUS:CONFIRMED\r\n';
  ics += 'SEQUENCE:0\r\n';
  ics += 'END:VEVENT\r\n';
  ics += 'END:VCALENDAR\r\n';

  return ics;
}

/**
 * Download .ics file
 */
function downloadICS(icsContent: string, filename: string) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export function BookingConfirmationPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: bookingLink } = useBookingLinkBySlug(slug || null);
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    // Get booking from URL params or localStorage
    const bookingId = new URLSearchParams(window.location.search).get(
      'bookingId'
    );
    if (bookingId) {
      // In a real app, fetch booking by ID
      // For MVP, we'll use localStorage or URL params
      const storedBooking = sessionStorage.getItem(`booking_${bookingId}`);
      if (storedBooking) {
        setBooking(JSON.parse(storedBooking));
      }
    }
  }, []);

  const handleDownloadICS = () => {
    if (!booking || !bookingLink) return;

    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    const title = bookingLink.title || `Booking with ${booking.booker_name}`;
    const description =
      booking.notes || `Booking confirmed for ${booking.booker_name}`;

    const ics = generateICS(
      title,
      description,
      start,
      end,
      undefined,
      undefined, // organizerEmail
      booking.booker_email
    );

    const filename = `booking-${start.toISOString().split('T')[0]}.ics`;
    downloadICS(ics, filename);
  };

  if (!booking) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#F5E6D3' }}
      >
        <Card>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-[#2B3448] mb-4">
              Booking Not Found
            </h1>
            <p className="text-gray-600 mb-6">
              Unable to find booking confirmation details.
            </p>
            <Button onClick={() => navigate('/')}>Go to Home</Button>
          </div>
        </Card>
      </div>
    );
  }

  const start = new Date(booking.start_time);
  const end = new Date(booking.end_time);

  return (
    <div
      className="min-h-screen py-12 px-4 sm:px-6 lg:px-8"
      style={{ background: '#F5E6D3' }}
    >
      <div className="max-w-2xl mx-auto">
        <Card className="p-8">
          <div className="text-center mb-8">
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
            <h1 className="text-3xl font-bold text-[#2B3448] mb-2">
              Booking Confirmed!
            </h1>
            <p className="text-lg text-[#4f4f4f]">
              Your appointment has been successfully scheduled.
            </p>
          </div>

          <div className="space-y-6 mb-8">
            {/* Booking Details */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-[#2B3448] mb-4">
                Booking Details
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Event</p>
                  <p className="font-medium text-[#2B3448]">
                    {bookingLink?.title ||
                      `Booking with ${booking.booker_name}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date & Time</p>
                  <p className="font-medium text-[#2B3448]">
                    {start.toLocaleString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                    {' - '}
                    {end.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="font-medium text-[#2B3448]">
                    {bookingLink?.duration || 30} minutes
                  </p>
                </div>
                {booking.notes && (
                  <div>
                    <p className="text-sm text-gray-600">Notes</p>
                    <p className="font-medium text-[#2B3448]">
                      {booking.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Calendar Summary */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-[#2B3448] mb-2">
                Add to Calendar
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Download a calendar file to add this booking to your calendar
                app.
              </p>
              <Button
                onClick={handleDownloadICS}
                variant="outline"
                className="w-full"
              >
                📅 Download .ics File
              </Button>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={() => navigate(`/book/${slug}`)}
              variant="outline"
              className="flex-1"
            >
              Book Another
            </Button>
            <Button onClick={() => navigate('/')} className="flex-1">
              Done
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
