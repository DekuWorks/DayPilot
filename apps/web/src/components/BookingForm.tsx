import { useState } from 'react';
import { Button, Input, Label } from '@daypilot/ui';
import type { BookingLink } from '@daypilot/types';

interface BookingFormProps {
  onSubmit: (data: {
    name: string;
    email: string;
    phone?: string;
    notes?: string;
  }) => Promise<void>;
  isSubmitting: boolean;
  selectedDate: Date | null;
  selectedTime: string | null;
  bookingLink?: BookingLink;
}

export function BookingForm({
  onSubmit,
  isSubmitting,
  selectedDate,
  selectedTime,
  bookingLink: _bookingLink,
}: BookingFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      alert('Please select a date and time first.');
      return;
    }
    await onSubmit(formData);
  };

  const formatSelectedDateTime = () => {
    if (!selectedDate || !selectedTime) return null;
    const date = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':').map(Number);
    date.setHours(hours, minutes);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {selectedDate && selectedTime && (
        <div className="mb-4 p-3 bg-[#4FB3B3]/10 border border-[#4FB3B3] rounded-lg">
          <p className="text-sm font-medium text-[#2B3448] mb-1">
            Selected Time
          </p>
          <p className="text-sm text-[#4f4f4f]">{formatSelectedDateTime()}</p>
        </div>
      )}

      <div>
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          placeholder="Your full name"
          required
        />
      </div>

      <div>
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={e => setFormData({ ...formData, email: e.target.value })}
          placeholder="your.email@example.com"
          required
        />
      </div>

      <div>
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={e => setFormData({ ...formData, phone: e.target.value })}
          placeholder="(555) 123-4567"
        />
      </div>

      <div>
        <Label htmlFor="notes">Notes (optional)</Label>
        <textarea
          id="notes"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          rows={3}
          value={formData.notes}
          onChange={e => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Any additional information..."
        />
      </div>

      <Button
        type="submit"
        disabled={!selectedDate || !selectedTime || isSubmitting}
        className="w-full"
      >
        {isSubmitting ? 'Booking...' : 'Confirm Booking'}
      </Button>

      {(!selectedDate || !selectedTime) && (
        <p className="text-sm text-gray-500 text-center">
          Please select a date and time to continue.
        </p>
      )}
    </form>
  );
}
