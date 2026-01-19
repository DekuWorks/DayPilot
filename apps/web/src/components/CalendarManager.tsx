import { useState } from 'react';
import {
  useCalendars,
  useCreateCalendar,
} from '@daypilot/lib';
import { Button, Card, Input, Label } from '@daypilot/ui';
import { supabaseClient } from '@daypilot/lib';
import type { Calendar } from '@daypilot/types';

export function CalendarManager() {
  const { data: calendars = [], refetch } = useCalendars();
  const createCalendar = useCreateCalendar();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    color: '#059669',
  });

  const handleCreateCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();
      if (!user) return;

      await createCalendar.mutateAsync({
        owner_id: user.id,
        name: formData.name,
        color: formData.color,
        is_default: false,
      });
      setIsModalOpen(false);
      setFormData({ name: '', color: '#059669' });
      refetch();
    } catch (error) {
      console.error('Error creating calendar:', error);
    }
  };

  const handleToggleVisibility = async (calendar: Calendar) => {
    try {
      await supabaseClient
        .from('calendars')
        .update({ is_visible: !calendar.is_visible })
        .eq('id', calendar.id);
      refetch();
    } catch (error) {
      console.error('Error toggling visibility:', error);
    }
  };

  const handleSetDefault = async (calendar: Calendar) => {
    try {
      // Unset all other defaults
      await supabaseClient
        .from('calendars')
        .update({ is_default: false })
        .eq('owner_id', calendar.owner_id);

      // Set this one as default
      await supabaseClient
        .from('calendars')
        .update({ is_default: true })
        .eq('id', calendar.id);
      refetch();
    } catch (error) {
      console.error('Error setting default calendar:', error);
    }
  };

  const handleRename = async (calendar: Calendar, newName: string) => {
    try {
      await supabaseClient
        .from('calendars')
        .update({ name: newName })
        .eq('id', calendar.id);
      refetch();
    } catch (error) {
      console.error('Error renaming calendar:', error);
    }
  };

  const handleDelete = async (calendar: Calendar) => {
    if (calendar.is_default) {
      alert('Cannot delete default calendar');
      return;
    }
    if (
      !confirm(
        `Are you sure you want to delete "${calendar.name}"? All events in this calendar will be deleted.`
      )
    ) {
      return;
    }

    try {
      await supabaseClient.from('calendars').delete().eq('id', calendar.id);
      refetch();
    } catch (error) {
      console.error('Error deleting calendar:', error);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Calendars</h2>
        <Button onClick={() => setIsModalOpen(true)}>New Calendar</Button>
      </div>

      <div className="space-y-2">
        {calendars.map((calendar) => (
          <Card key={calendar.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: calendar.color }}
                />
                <div className="flex-1">
                  <input
                    type="text"
                    value={calendar.name}
                    onChange={(e) => handleRename(calendar, e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value !== calendar.name) {
                        handleRename(calendar, e.target.value);
                      }
                    }}
                    className="font-semibold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded px-1"
                  />
                  {calendar.is_default && (
                    <span className="text-xs text-gray-500 ml-2">(Default)</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={calendar.is_visible !== false}
                    onChange={() => handleToggleVisibility(calendar)}
                    className="w-4 h-4"
                  />
                  <span className="ml-2 text-sm">Show</span>
                </label>
                {!calendar.is_default && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetDefault(calendar)}
                    >
                      Set Default
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(calendar)}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">New Calendar</h2>
            <form onSubmit={handleCreateCalendar} className="space-y-4">
              <div>
                <Label htmlFor="calendar-name">Name</Label>
                <Input
                  id="calendar-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="calendar-color">Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="calendar-color"
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Create
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}





