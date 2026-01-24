import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button } from '@daypilot/ui';
import {
  useBookingLinkBySlug,
  useAvailabilityRules,
  useExcludedDates,
  useBookings,
  useCreateBooking,
  useSendEmail,
} from '@daypilot/lib';
import { BookingCalendar } from '../components/BookingCalendar';
import { BookingForm } from '../components/BookingForm';

export function BookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: bookingLink, isLoading, error } = useBookingLinkBySlug(slug || null);
  const { data: availabilityRules = [] } = useAvailabilityRules(bookingLink?.id || null);
  const { data: excludedDates = [] } = useExcludedDates(bookingLink?.id || null);
  const { data: existingBookings = [] } = useBookings(bookingLink?.id || null);
  const createBooking = useCreateBooking();
  const sendEmail = useSendEmail();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5E6D3' }}>
        <Card>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </Card>
      </div>
    );
  }

  if (error || !bookingLink || !bookingLink.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5E6D3' }}>
        <Card>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-[#2B3448] mb-4">Booking Link Not Found</h1>
            <p className="text-gray-600 mb-6">
              This booking link doesn't exist or is no longer active.
            </p>
            <Button onClick={() => (window.location.href = '/')}>Go to Home</Button>
          </div>
        </Card>
      </div>
    );
  }

  const handleTimeSelect = (date: Date, time: string) => {
    setSelectedDate(date);
    if (time) {
      setSelectedTime(time);
    } else {
      setSelectedTime(null);
    }
  };

  const handleBookingSubmit = async (formData: {
    name: string;
    email: string;
    phone?: string;
    notes?: string;
  }) => {
    if (!selectedDate || !selectedTime || !bookingLink) return;

    setIsSubmitting(true);
    try {
      // Calculate start and end times
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(hours, minutes, 0, 0);

      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + bookingLink.duration);

      // Convert to booking link's timezone
      const startTimeISO = startDateTime.toISOString();
      const endTimeISO = endDateTime.toISOString();

      const booking = await createBooking.mutateAsync({
        booking_link_id: bookingLink.id,
        booker_name: formData.name,
        booker_email: formData.email,
        booker_phone: formData.phone,
        start_time: startTimeISO,
        end_time: endTimeISO,
        timezone: bookingLink.timezone,
        notes: formData.notes,
      });

      // Store booking in sessionStorage for confirmation page
      if (booking?.id) {
        sessionStorage.setItem(`booking_${booking.id}`, JSON.stringify(booking));
      }

      // Create event in storage (localStorage or Supabase)
      try {
        const { getEvents, saveEvents } = await import('@daypilot/lib');
        const events = await getEvents();
        const newEvent = {
          id: `event-${Date.now()}`,
          title: `Booking: ${formData.name}`,
          description: formData.notes || `Booked by ${formData.name} (${formData.email})`,
          start: startTimeISO,
          end: endTimeISO,
          status: 'scheduled' as const,
          all_day: false,
          color: '#059669',
          category_id: null,
        };
        await saveEvents([...events, newEvent]);
      } catch (err) {
        console.error('Failed to create event:', err);
        // Don't block booking confirmation if event creation fails
      }

      // Send booking confirmation email
      try {
        const { bookingConfirmationTemplate } = await import('../emails/templates');
        const start = new Date(startTimeISO);
        const end = new Date(endTimeISO);
        const calendarLink = `${window.location.origin}/book/${slug}/confirmed?bookingId=${booking?.id || Date.now()}`;
        
        const template = bookingConfirmationTemplate({
          bookingTitle: bookingLink.title || 'Booking',
          bookerName: formData.name,
          bookerEmail: formData.email,
          bookingDate: start.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          bookingTime: `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
          duration: bookingLink.duration,
          notes: formData.notes,
          calendarLink,
        });
        
        await sendEmail.mutateAsync({
          to: formData.email,
          template,
        });
      } catch (emailError) {
        console.error('Failed to send booking confirmation email:', emailError);
        // Don't block booking if email fails
      }

      // Navigate to confirmation page
      navigate(`/book/${slug}/confirmed?bookingId=${booking?.id || Date.now()}`);
    } catch (error: any) {
      alert('Error creating booking: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8" style={{ background: '#F5E6D3' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#2B3448] mb-2">
            {bookingLink.title || 'Book an Appointment'}
          </h1>
          {bookingLink.description && (
            <p className="text-lg text-[#4f4f4f] max-w-2xl mx-auto">
              {bookingLink.description}
            </p>
          )}
          <div className="mt-4 text-sm text-gray-600">
            <span>Duration: {bookingLink.duration} minutes</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Calendar & Time Selection */}
          <Card>
            <h2 className="text-xl font-semibold mb-4 text-[#2B3448]">Select Date & Time</h2>
            <BookingCalendar
              bookingLink={bookingLink}
              availabilityRules={availabilityRules}
              excludedDates={excludedDates}
              existingBookings={existingBookings}
              onTimeSelect={handleTimeSelect}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
            />
          </Card>

          {/* Booking Form */}
          <Card>
            <h2 className="text-xl font-semibold mb-4 text-[#2B3448]">Your Information</h2>
            <BookingForm
              onSubmit={handleBookingSubmit}
              isSubmitting={isSubmitting}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              bookingLink={bookingLink}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
