import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Input, Label, Badge } from '@daypilot/ui';
import {
  useBookingLinks,
  useCreateBookingLink,
  useUpdateBookingLink,
  useAvailabilityRules,
  useExcludedDates,
  getUserTimezone,
} from '@daypilot/lib';
import { AvailabilityEditor } from '../../components/AvailabilityEditor';
import { ExcludedDatesEditor } from '../../components/ExcludedDatesEditor';
import type { BookingLink } from '@daypilot/types';

export function BookingLinkEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const { data: bookingLinks = [] } = useBookingLinks();
  const existingBookingLink = bookingLinks.find((bl) => bl.id === id);

  const createBookingLink = useCreateBookingLink();
  const updateBookingLink = useUpdateBookingLink();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: 30,
    buffer_before: 0,
    buffer_after: 0,
    min_notice: 60,
    max_per_day: null as number | null,
    timezone: getUserTimezone(),
    type: 'one-on-one' as 'one-on-one' | 'group',
    is_active: true,
    organization_id: null as string | null,
  });

  useEffect(() => {
    if (existingBookingLink) {
      setFormData({
        title: existingBookingLink.title || '',
        description: existingBookingLink.description || '',
        duration: existingBookingLink.duration,
        buffer_before: existingBookingLink.buffer_before,
        buffer_after: existingBookingLink.buffer_after,
        min_notice: existingBookingLink.min_notice,
        max_per_day: existingBookingLink.max_per_day,
        timezone: existingBookingLink.timezone,
        type: existingBookingLink.type,
        is_active: existingBookingLink.is_active,
        organization_id: existingBookingLink.organization_id,
      });
    }
  }, [existingBookingLink]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isNew) {
        const newBookingLink = await createBookingLink.mutateAsync({
          title: formData.title || undefined,
          description: formData.description || undefined,
          duration: formData.duration,
          buffer_before: formData.buffer_before,
          buffer_after: formData.buffer_after,
          min_notice: formData.min_notice,
          max_per_day: formData.max_per_day,
          timezone: formData.timezone,
          type: formData.type,
          organization_id: formData.organization_id,
        });
        navigate(`/app/booking-links/${newBookingLink.id}`);
      } else if (id) {
        await updateBookingLink.mutateAsync({
          id,
          updates: {
            title: formData.title || null,
            description: formData.description || null,
            duration: formData.duration,
            buffer_before: formData.buffer_before,
            buffer_after: formData.buffer_after,
            min_notice: formData.min_notice,
            max_per_day: formData.max_per_day,
            timezone: formData.timezone,
            type: formData.type,
            is_active: formData.is_active,
          },
          organizationId: formData.organization_id,
        });
        alert('Booking link updated successfully!');
      }
    } catch (error: any) {
      alert('Error saving booking link: ' + error.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">
          {isNew ? 'Create Booking Link' : 'Edit Booking Link'}
        </h1>
        <Button variant="outline" onClick={() => navigate('/app/booking-links')}>
          Back to List
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., 30-Minute Consultation"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What will this booking be about?"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as 'one-on-one' | 'group',
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="one-on-one">One-on-One</option>
                  <option value="group">Group</option>
                </select>
              </div>

              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <Label htmlFor="is_active" className="mb-0">
                  Active (accepting bookings)
                </Label>
              </div>
            </div>
          </div>
        </Card>

        {/* Scheduling Settings */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">Scheduling Settings</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Duration (minutes) *</Label>
              <Input
                id="duration"
                type="number"
                min="5"
                step="5"
                value={formData.duration}
                onChange={(e) =>
                  setFormData({ ...formData, duration: parseInt(e.target.value) || 30 })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {((Intl as any).supportedValuesOf('timeZone') as string[]).map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="buffer_before">Buffer Before (minutes)</Label>
              <Input
                id="buffer_before"
                type="number"
                min="0"
                value={formData.buffer_before}
                onChange={(e) =>
                  setFormData({ ...formData, buffer_before: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div>
              <Label htmlFor="buffer_after">Buffer After (minutes)</Label>
              <Input
                id="buffer_after"
                type="number"
                min="0"
                value={formData.buffer_after}
                onChange={(e) =>
                  setFormData({ ...formData, buffer_after: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div>
              <Label htmlFor="min_notice">Minimum Notice (minutes)</Label>
              <Input
                id="min_notice"
                type="number"
                min="0"
                value={formData.min_notice}
                onChange={(e) =>
                  setFormData({ ...formData, min_notice: parseInt(e.target.value) || 0 })
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                How far in advance bookings must be made
              </p>
            </div>

            <div>
              <Label htmlFor="max_per_day">Max Bookings Per Day</Label>
              <Input
                id="max_per_day"
                type="number"
                min="1"
                value={formData.max_per_day || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_per_day: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                placeholder="Unlimited"
              />
            </div>
          </div>
        </Card>

        {/* Availability */}
        {!isNew && id && (
          <>
            <Card>
              <AvailabilityEditor bookingLinkId={id} />
            </Card>

            <Card>
              <ExcludedDatesEditor bookingLinkId={id} />
            </Card>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={createBookingLink.isPending || updateBookingLink.isPending}
            className="flex-1"
          >
            {isNew
              ? createBookingLink.isPending
                ? 'Creating...'
                : 'Create Booking Link'
              : updateBookingLink.isPending
                ? 'Saving...'
                : 'Save Changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/app/booking-links')}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

