import { useState } from 'react';
import { Button, Input, Label } from '@daypilot/ui';
import { useExcludedDates } from '@daypilot/lib';
import { useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@daypilot/lib';

interface ExcludedDatesEditorProps {
  bookingLinkId: string;
}

export function ExcludedDatesEditor({
  bookingLinkId,
}: ExcludedDatesEditorProps) {
  const { data: excludedDates = [] } = useExcludedDates(bookingLinkId);
  const queryClient = useQueryClient();
  const [newDate, setNewDate] = useState('');
  const [newReason, setNewReason] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newDate) return;

    setIsAdding(true);
    try {
      const { error } = await supabaseClient
        .from('booking_excluded_dates')
        .insert({
          booking_link_id: bookingLinkId,
          excluded_date: newDate,
          reason: newReason || null,
        });

      if (error) throw error;

      queryClient.invalidateQueries({
        queryKey: ['excluded-dates', bookingLinkId],
      });

      setNewDate('');
      setNewReason('');
    } catch (error: any) {
      alert('Error adding excluded date: ' + error.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabaseClient
        .from('booking_excluded_dates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      queryClient.invalidateQueries({
        queryKey: ['excluded-dates', bookingLinkId],
      });
    } catch (error: any) {
      alert('Error deleting excluded date: ' + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Excluded Dates</h2>
      <p className="text-sm text-gray-600 mb-4">
        Add dates when this booking link should not be available (holidays, time
        off, etc.).
      </p>

      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="excluded-date">Date</Label>
            <Input
              id="excluded-date"
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="excluded-reason">Reason (optional)</Label>
            <Input
              id="excluded-reason"
              value={newReason}
              onChange={e => setNewReason(e.target.value)}
              placeholder="e.g., Holiday, Time off"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleAdd}
              disabled={!newDate || isAdding}
              size="sm"
            >
              {isAdding ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </div>

        {excludedDates.length > 0 ? (
          <div className="space-y-2">
            {excludedDates.map(excludedDate => (
              <div
                key={excludedDate.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {new Date(excludedDate.excluded_date).toLocaleDateString(
                      'en-US',
                      {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }
                    )}
                  </p>
                  {excludedDate.reason && (
                    <p className="text-sm text-gray-600">
                      {excludedDate.reason}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(excludedDate.id)}
                  disabled={deletingId === excludedDate.id}
                  className="text-red-600 hover:text-red-700 hover:border-red-300"
                >
                  {deletingId === excludedDate.id ? 'Deleting...' : 'Remove'}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            No excluded dates. All available dates will be bookable.
          </p>
        )}
      </div>
    </div>
  );
}
