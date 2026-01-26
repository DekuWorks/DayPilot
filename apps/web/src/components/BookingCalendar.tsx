import { useState, useMemo } from 'react';
import { Button } from '@daypilot/ui';
import type { BookingLink, AvailabilityRule, BookingExcludedDate, Booking } from '@daypilot/types';
import { scoreAndSortSlots } from '../utils/slotScoring';

interface BookingCalendarProps {
  bookingLink: BookingLink;
  availabilityRules: AvailabilityRule[];
  excludedDates: BookingExcludedDate[];
  existingBookings: Booking[];
  onTimeSelect: (date: Date, time: string) => void;
  selectedDate: Date | null;
  selectedTime: string | null;
}

export function BookingCalendar({
  bookingLink,
  availabilityRules,
  excludedDates,
  existingBookings,
  onTimeSelect,
  selectedDate,
  selectedTime,
}: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Get excluded date strings for quick lookup
  const excludedDateStrings = useMemo(
    () => new Set(excludedDates.map((ed) => ed.excluded_date)),
    [excludedDates]
  );

  // Get existing bookings grouped by date
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    existingBookings.forEach((booking) => {
      const date = new Date(booking.start_time).toISOString().split('T')[0];
      if (!map.has(date)) {
        map.set(date, []);
      }
      map.get(date)!.push(booking);
    });
    return map;
  }, [existingBookings]);

  // Calculate available time slots for a given date (with scoring)
  const getAvailableSlots = (date: Date, sorted: boolean = true): string[] => {
    const dayOfWeek = date.getDay();
    const dateString = date.toISOString().split('T')[0];

    // Check if date is excluded
    if (excludedDateStrings.has(dateString)) {
      return [];
    }

    // Check minimum notice requirement
    const now = new Date();
    const minNoticeMs = bookingLink.min_notice * 60 * 1000;
    if (date.getTime() - now.getTime() < minNoticeMs) {
      return [];
    }

    // Check max bookings per day
    const bookingsForDate = bookingsByDate.get(dateString) || [];
    if (bookingLink.max_per_day && bookingsForDate.length >= bookingLink.max_per_day) {
      return [];
    }

    // Find availability rule for this day
    const rule = availabilityRules.find((r) => r.day_of_week === dayOfWeek && r.is_available);
    if (!rule) {
      return [];
    }

    // Generate time slots
    const slots: string[] = [];
    const [startHour, startMinute] = rule.start_time.split(':').map(Number);
    const [endHour, endMinute] = rule.end_time.split(':').map(Number);

    const startTime = new Date(date);
    startTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(endHour, endMinute, 0, 0);

    const currentTime = new Date(startTime);

    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime);
      slotEnd.setMinutes(slotEnd.getMinutes() + bookingLink.duration);

      // Check if slot fits before end time
      if (slotEnd <= endTime) {
        // Check for conflicts with existing bookings
        const hasConflict = bookingsForDate.some((booking) => {
          const bookingStart = new Date(booking.start_time);
          const bookingEnd = new Date(booking.end_time);

          // Check if slots overlap (accounting for buffers)
          const slotStartWithBuffer = new Date(currentTime);
          slotStartWithBuffer.setMinutes(
            slotStartWithBuffer.getMinutes() - bookingLink.buffer_before
          );

          const slotEndWithBuffer = new Date(slotEnd);
          slotEndWithBuffer.setMinutes(slotEndWithBuffer.getMinutes() + bookingLink.buffer_after);

          return (
            (slotStartWithBuffer < bookingEnd && slotEndWithBuffer > bookingStart) ||
            (bookingStart < slotEndWithBuffer && bookingEnd > slotStartWithBuffer)
          );
        });

        // Check if slot is in the past
        const isPast = currentTime < new Date();

        if (!hasConflict && !isPast) {
          const timeString = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
          slots.push(timeString);
        }
      }

      // Move to next slot (15-minute intervals)
      currentTime.setMinutes(currentTime.getMinutes() + 15);
    }

    // Score and sort slots if requested
    if (sorted && slots.length > 0) {
      const bookingsForScoring = bookingsForDate.map(booking => ({
        start: new Date(booking.start_time),
        end: new Date(booking.end_time),
      }));
      
      const scored = scoreAndSortSlots(
        slots,
        date,
        bookingsForScoring,
        bookingLink.buffer_before,
        bookingLink.buffer_after
      );
      
      return scored.map(s => s.time);
    }

    return slots;
  };

  // Get days in current month
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    // Add days from previous month to fill first week
    const startDay = firstDay.getDay();
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push(date);
    }

    // Add days of current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    // Add days from next month to fill last week
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push(new Date(year, month + 1, day));
    }

    return days;
  }, [currentMonth]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  return (
    <div>
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateMonth('prev')}
        >
          ←
        </Button>
        <h3 className="text-lg font-semibold text-[#2B3448]">
          {formatMonthYear(currentMonth)}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateMonth('next')}
        >
          →
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
            {day}
          </div>
        ))}
        {daysInMonth.map((date, index) => {
          const dateString = date.toISOString().split('T')[0];
          const slots = getAvailableSlots(date);
          const hasSlots = slots.length > 0;
          const isExcluded = excludedDateStrings.has(dateString);
          const isPast = date < new Date() && !isToday(date);

          return (
            <button
              key={index}
              onClick={() => {
                if (hasSlots && !isExcluded && !isPast) {
                  onTimeSelect(new Date(date), '');
                }
              }}
              disabled={!hasSlots || isExcluded || isPast}
              className={`
                aspect-square p-1 text-sm rounded-lg transition-colors
                ${!isCurrentMonth(date) ? 'text-gray-300' : ''}
                ${isPast ? 'text-gray-300 cursor-not-allowed' : ''}
                ${isExcluded ? 'text-gray-300 cursor-not-allowed' : ''}
                ${isSelected(date) ? 'bg-[#4FB3B3] text-white' : ''}
                ${!isSelected(date) && hasSlots && !isExcluded && !isPast ? 'hover:bg-gray-100' : ''}
                ${!hasSlots && !isExcluded && !isPast ? 'text-gray-400' : ''}
                ${isToday(date) && !isSelected(date) ? 'ring-2 ring-[#4FB3B3]' : ''}
              `}
            >
              {date.getDate()}
              {hasSlots && !isExcluded && !isPast && (
                <div className="text-xs mt-0.5 text-[#4FB3B3]">{slots.length}</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Time Slots */}
      {selectedDate && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold mb-3 text-[#2B3448]">
            Available Times for {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </h4>
          <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
            {getAvailableSlots(selectedDate).map((time) => (
              <button
                key={time}
                onClick={() => onTimeSelect(selectedDate, time)}
                className={`
                  px-4 py-2 text-sm rounded-lg border transition-colors
                  ${selectedTime === time
                    ? 'bg-[#4FB3B3] text-white border-[#4FB3B3]'
                    : 'border-gray-300 hover:border-[#4FB3B3] hover:bg-[#4FB3B3]/10'
                  }
                `}
              >
                {time}
              </button>
            ))}
          </div>
          {getAvailableSlots(selectedDate).length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No available times for this date.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
