import { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type {
  EventClickArg,
  DateSelectArg,
  EventDropArg,
  DatesSetArg,
} from '@fullcalendar/core';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import {
  useEvents,
  useCalendars,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
} from '@daypilot/lib';
import { Button, Card, Input, Label } from '@daypilot/ui';
import { RecurrenceEditor } from '../../components/RecurrenceEditor';
import { expandRecurringEvent } from '@daypilot/lib';
import type { Event } from '@daypilot/types';

export function CalendarPage() {
  const { data: events = [], isLoading } = useEvents();
  const { data: calendars = [] } = useCalendars();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewEvent, setIsNewEvent] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    all_day: false,
    color: '',
    icon: '',
    calendar_id:
      calendars.find(c => c.is_default)?.id || calendars[0]?.id || '',
    recurrence_rule: null as string | null,
    recurrence_end_date: null as string | null,
  });

  // Filter events by visible calendars
  const visibleCalendars = calendars.filter(cal => cal.is_visible !== false);
  const visibleCalendarIds = new Set(visibleCalendars.map(cal => cal.id));
  const filteredEvents = events.filter(event =>
    visibleCalendarIds.has(event.calendar_id)
  );

  // Expand recurring events and create calendar events
  const calendarEvents: Array<{
    id: string;
    title: string;
    start: string | Date;
    end: string | Date;
    allDay: boolean;
    color: string;
    backgroundColor: string;
    borderColor: string;
    extendedProps: any;
  }> = [];

  // Get current view date range (approximate - FullCalendar will handle the rest)
  const now = new Date();
  const viewStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const viewEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);

  filteredEvents.forEach(event => {
    const calendar = calendars.find(c => c.id === event.calendar_id);
    const baseTitle = event.icon ? `${event.icon} ${event.title}` : event.title;

    if (event.recurrence_rule && !event.is_recurring_instance) {
      // Expand recurring event
      const instances = expandRecurringEvent(event, viewStart, viewEnd);
      instances.forEach(instance => {
        calendarEvents.push({
          id: `${event.id}-${instance.start.getTime()}`,
          title: baseTitle,
          start: instance.start,
          end: instance.end,
          allDay: event.all_day || false,
          color: event.color || calendar?.color || '#059669',
          backgroundColor: event.color || calendar?.color || '#059669',
          borderColor: event.color || calendar?.color || '#059669',
          extendedProps: {
            description: event.description,
            status: event.status,
            calendar_id: event.calendar_id,
            icon: event.icon,
            all_day: event.all_day,
            recurrence_rule: event.recurrence_rule,
            is_recurring_instance: true,
            parent_event_id: event.id,
          },
        });
      });
    } else {
      // Regular event
      calendarEvents.push({
        id: event.id,
        title: baseTitle,
        start: event.start,
        end: event.end,
        allDay: event.all_day || false,
        color: event.color || calendar?.color || '#059669',
        backgroundColor: event.color || calendar?.color || '#059669',
        borderColor: event.color || calendar?.color || '#059669',
        extendedProps: {
          description: event.description,
          status: event.status,
          calendar_id: event.calendar_id,
          icon: event.icon,
          all_day: event.all_day,
          recurrence_rule: event.recurrence_rule,
        },
      });
    }
  });

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = events.find(e => e.id === clickInfo.event.id);
    if (event) {
      setSelectedEvent(event);
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);
      setFormData({
        title: event.title,
        description: event.description || '',
        start: event.all_day
          ? startDate.toISOString().slice(0, 10)
          : startDate.toISOString().slice(0, 16),
        end: event.all_day
          ? endDate.toISOString().slice(0, 10)
          : endDate.toISOString().slice(0, 16),
        all_day: event.all_day || false,
        color: event.color || '',
        icon: event.icon || '',
        calendar_id: event.calendar_id,
        recurrence_rule: event.recurrence_rule || null,
        recurrence_end_date: event.recurrence_end_date || null,
      });
      setIsNewEvent(false);
      setIsModalOpen(true);
    }
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const start = new Date(selectInfo.start);
    const end = new Date(selectInfo.end);
    setFormData({
      title: '',
      description: '',
      start: selectInfo.allDay
        ? start.toISOString().slice(0, 10)
        : start.toISOString().slice(0, 16),
      end: selectInfo.allDay
        ? end.toISOString().slice(0, 10)
        : end.toISOString().slice(0, 16),
      all_day: selectInfo.allDay,
      color: '',
      icon: '',
      calendar_id:
        calendars.find(c => c.is_default)?.id || calendars[0]?.id || '',
      recurrence_rule: null,
      recurrence_end_date: null,
    });
    setSelectedEvent(null);
    setIsNewEvent(true);
    setIsModalOpen(true);
  };

  const handleEventDrop = async (dropInfo: EventDropArg) => {
    const event = events.find(e => e.id === dropInfo.event.id);
    if (!event) return;

    try {
      const newStart = dropInfo.event.start;
      if (!newStart) {
        dropInfo.revert();
        return;
      }
      const newEnd =
        dropInfo.event.end || new Date(newStart.getTime() + 3600000);

      await updateEvent.mutateAsync({
        id: event.id,
        start: newStart.toISOString(),
        end: newEnd.toISOString(),
      });
    } catch (error) {
      console.error('Error moving event:', error);
      dropInfo.revert();
    }
  };

  const handleEventResize = async (resizeInfo: EventResizeDoneArg) => {
    const event = events.find(e => e.id === resizeInfo.event.id);
    if (!event) return;

    try {
      const newStart = resizeInfo.event.start;
      if (!newStart) {
        resizeInfo.revert();
        return;
      }
      const newEnd =
        resizeInfo.event.end || new Date(newStart.getTime() + 3600000);

      await updateEvent.mutateAsync({
        id: event.id,
        start: newStart.toISOString(),
        end: newEnd.toISOString(),
      });
    } catch (error) {
      console.error('Error resizing event:', error);
      resizeInfo.revert();
    }
  };

  const handleViewChange = (arg: DatesSetArg) => {
    setCurrentView(arg.view.type);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let startDate: Date;
    let endDate: Date;

    if (formData.all_day) {
      startDate = new Date(formData.start + 'T00:00:00');
      endDate = new Date(formData.end + 'T23:59:59');
    } else {
      startDate = new Date(formData.start);
      endDate = new Date(formData.end);
    }

    const eventData = {
      title: formData.title,
      description: formData.description || null,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      all_day: formData.all_day,
      color: formData.color || null,
      icon: formData.icon || null,
      calendar_id: formData.calendar_id,
      recurrence_rule: formData.recurrence_rule,
      recurrence_end_date: formData.recurrence_end_date,
      status: 'scheduled' as const,
    };

    try {
      if (isNewEvent) {
        await createEvent.mutateAsync(eventData);
      } else if (selectedEvent) {
        await updateEvent.mutateAsync({
          id: selectedEvent.id,
          ...eventData,
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const handleDelete = async () => {
    if (selectedEvent) {
      try {
        await deleteEvent.mutateAsync(selectedEvent.id);
        setIsModalOpen(false);
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Calendar</h1>
        <Card>
          <div className="animate-pulse">Loading calendar...</div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Calendar</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setFormData({
                title: '',
                description: '',
                start: new Date().toISOString().slice(0, 16),
                end: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
                all_day: false,
                color: '',
                icon: '',
                calendar_id:
                  calendars.find(c => c.is_default)?.id ||
                  calendars[0]?.id ||
                  '',
                recurrence_rule: null,
                recurrence_end_date: null,
              });
              setSelectedEvent(null);
              setIsNewEvent(true);
              setIsModalOpen(true);
            }}
          >
            New Event
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <FullCalendar
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            listPlugin,
            interactionPlugin,
          ]}
          initialView={currentView}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right:
              'dayGridMonth,timeGridWeek,timeGridThreeDay,timeGridDay,listWeek',
          }}
          views={{
            timeGridThreeDay: {
              type: 'timeGrid',
              duration: { days: 3 },
              buttonText: '3 Day',
            },
          }}
          events={calendarEvents}
          eventClick={handleEventClick}
          selectable={true}
          selectMirror={true}
          select={handleDateSelect}
          editable={true}
          droppable={true}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          height="auto"
          dayMaxEvents={true}
          moreLinkClick="popover"
          datesSet={handleViewChange}
          nowIndicator={true}
          slotMinTime="00:00:00"
          slotMaxTime="24:00:00"
          allDaySlot={true}
          firstDay={1} // Start week on Monday
        />
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {isNewEvent ? 'New Event' : 'Edit Event'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={e =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={formData.description}
                  onChange={e =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="calendar_id">Calendar</Label>
                <select
                  id="calendar_id"
                  value={formData.calendar_id}
                  onChange={e =>
                    setFormData({ ...formData, calendar_id: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  {calendars.map(calendar => (
                    <option key={calendar.id} value={calendar.id}>
                      {calendar.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="all_day"
                  checked={formData.all_day}
                  onChange={e =>
                    setFormData({ ...formData, all_day: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <Label htmlFor="all_day" className="mb-0">
                  All-day event
                </Label>
              </div>
              <div>
                <Label htmlFor="start">
                  {formData.all_day ? 'Date' : 'Start'}
                </Label>
                <Input
                  id="start"
                  type={formData.all_day ? 'date' : 'datetime-local'}
                  value={formData.start}
                  onChange={e =>
                    setFormData({ ...formData, start: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="end">
                  {formData.all_day ? 'End Date' : 'End'}
                </Label>
                <Input
                  id="end"
                  type={formData.all_day ? 'date' : 'datetime-local'}
                  value={formData.end}
                  onChange={e =>
                    setFormData({ ...formData, end: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="icon">Icon/Emoji (optional)</Label>
                <Input
                  id="icon"
                  type="text"
                  placeholder="🎯 📅 ⚡"
                  value={formData.icon}
                  onChange={e =>
                    setFormData({ ...formData, icon: e.target.value })
                  }
                  maxLength={2}
                />
              </div>
              <div>
                <Label htmlFor="color">Color (optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color || '#059669'}
                    onChange={e =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={formData.color || ''}
                    onChange={e =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    placeholder="#059669"
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <RecurrenceEditor
                  recurrenceRule={formData.recurrence_rule}
                  recurrenceEndDate={formData.recurrence_end_date}
                  onRecurrenceChange={(rule, endDate) => {
                    setFormData({
                      ...formData,
                      recurrence_rule: rule,
                      recurrence_end_date: endDate,
                    });
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {isNewEvent ? 'Create' : 'Update'}
                </Button>
                {!isNewEvent && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDelete}
                    className="flex-1"
                  >
                    Delete
                  </Button>
                )}
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
