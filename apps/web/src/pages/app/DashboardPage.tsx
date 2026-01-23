import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import type {
  EventClickArg,
  DateSelectArg,
  DatesSetArg,
} from '@fullcalendar/core';
import { Button, Card, Input, Label } from '@daypilot/ui';
import { RecurrenceEditor } from '../../components/RecurrenceEditor';
import { expandRecurringEvent, supabaseClient } from '@daypilot/lib';
import { PilotBrief } from '../../features/pilotBrief/PilotBrief';
import type { LocalEvent as PilotBriefLocalEvent } from '../../features/pilotBrief/pilotBriefTypes';
import { InsightsCard } from '../../features/insights/InsightsCard';
import { calculateInsightsSummary } from '../../features/insights/insightsSelectors';
import { useMemo } from 'react';
import {
  getEvents,
  saveEvents,
  getCategories,
  saveCategories,
  getTasks,
  saveTasks,
} from '@daypilot/lib';
import type { Event, Category, Task, TaskPriority, TaskStatus } from '@daypilot/types';
import type { User } from '@supabase/supabase-js';

// Enhanced event type with recurrence support for localStorage
interface LocalEvent {
  id: string;
  title: string;
  description: string | null;
  start: string;
  end: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  all_day?: boolean;
  color?: string | null;
  icon?: string | null;
  recurrence_rule?: string | null;
  recurrence_end_date?: string | null;
  parent_event_id?: string | null;
  is_recurring_instance?: boolean;
  timezone?: string | null;
  category_id?: string | null;
  calendar_id?: string;
}

// Helper to get pastel color for event
function getPastelColor(category: Category | null): string {
  if (category) {
    const colorMap: Record<string, string> = {
      '#3B82F6': '#E3F2FD', // Blue -> Light blue
      '#10B981': '#E0F2F1', // Green -> Mint
      '#EF4444': '#FFEBEE', // Red -> Light pink
      '#8B5CF6': '#F3E5F5', // Purple -> Light purple
      '#F59E0B': '#FFF9C4', // Yellow -> Light yellow
    };
    return colorMap[category.color] || '#E0F2F1';
  }
  return '#E0F2F1'; // Default mint
}

// Helper to get text color for event
function getTextColor(category: Category | null): string {
  if (category) {
    const textMap: Record<string, string> = {
      '#3B82F6': '#0D47A1', // Blue -> Dark blue
      '#10B981': '#004D40', // Green -> Dark green
      '#EF4444': '#B71C1C', // Red -> Dark red
      '#8B5CF6': '#4A148C', // Purple -> Dark purple
      '#F59E0B': '#F57F17', // Yellow -> Dark yellow
    };
    return textMap[category.color] || '#004D40';
  }
  return '#004D40'; // Default dark green
}

export function DashboardPage() {
  const [currentView, setCurrentView] = useState('timeGridWeek');
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<LocalEvent | null>(null);
  const [isNewEvent, setIsNewEvent] = useState(false);
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    all_day: false,
    color: '#059669',
    category_id: null as string | null,
    recurrence_rule: null as string | null,
    recurrence_end_date: null as string | null,
  });

  // Load user
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedEvents = getEvents();
    const savedTasks = getTasks();
    const savedCategories = getCategories();
    
    setEvents(savedEvents);
    setTasks(savedTasks);
    setCategories(savedCategories);

    // Create default categories if none exist
    if (savedCategories.length === 0) {
      const defaultCategories: Category[] = [
        { id: '1', user_id: 'local', name: 'Work', color: '#3B82F6', icon: '💼', created_at: new Date().toISOString() },
        { id: '2', user_id: 'local', name: 'Personal', color: '#10B981', icon: '🏠', created_at: new Date().toISOString() },
        { id: '3', user_id: 'local', name: 'Health', color: '#EF4444', icon: '❤️', created_at: new Date().toISOString() },
        { id: '4', user_id: 'local', name: 'Education', color: '#8B5CF6', icon: '📚', created_at: new Date().toISOString() },
      ];
      setCategories(defaultCategories);
      saveCategories(defaultCategories);
    }
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    saveEvents(events);
  }, [events]);

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    saveCategories(categories);
  }, [categories]);

  // Expand recurring events and convert to FullCalendar format
  const now = new Date();
  const viewStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const viewEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);

  const calendarEvents: any[] = events.flatMap((event) => {
    const category: Category | null = event.category_id ? categories.find((c) => c.id === event.category_id) || null : null;
    const baseTitle = event.icon ? `${event.icon} ${event.title}` : event.title;
    const pastelBg = getPastelColor(category);
    const textColor = getTextColor(category);
    const eventColor = event.color || category?.color || '#059669';

    if (event.recurrence_rule && !event.is_recurring_instance) {
      // Expand recurring event
      const instances = expandRecurringEvent(event as Event, viewStart, viewEnd);
      return instances.map((instance) => ({
        id: `${event.id}-${instance.start.getTime()}`,
        title: baseTitle,
        start: instance.start,
        end: instance.end,
        allDay: event.all_day || false,
        backgroundColor: pastelBg,
        borderColor: eventColor,
        textColor: textColor,
        extendedProps: {
          ...event,
          isRecurringInstance: true,
        },
      }));
    } else {
      // Regular event
      return [{
        id: event.id,
        title: baseTitle,
        start: new Date(event.start),
        end: new Date(event.end),
        allDay: event.all_day || false,
        backgroundColor: pastelBg,
        borderColor: eventColor,
        textColor: textColor,
        extendedProps: {
          ...event,
          isRecurringInstance: false,
        },
      }];
    }
  });

  // Filter events (no search/category filter for now - can be added later)
  const filteredEvents = calendarEvents;

  // Get upcoming event
  const upcomingEvent = events
    .filter(e => new Date(e.start) > new Date())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];

  // Calculate time breakdown
  const todayEvents = events.filter(e => {
    const eventDate = new Date(e.start);
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  });

  const breakdown = {
    meetings: todayEvents.filter(e => e.category_id === categories.find(c => c.name === 'Work')?.id).length,
    projects: todayEvents.filter(e => e.category_id === categories.find(c => c.name === 'Personal')?.id).length,
    education: todayEvents.filter(e => e.category_id === categories.find(c => c.name === 'Education')?.id).length,
    events: todayEvents.filter(e => e.category_id === categories.find(c => c.name === 'Health')?.id).length,
    reviews: todayEvents.length - todayEvents.filter(e => e.category_id).length,
  };
  const total = todayEvents.length || 1;

  const handleViewChange = (arg: DatesSetArg) => {
    setCurrentView(arg.view.type);
    setCurrentDate(arg.start);
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const start = selectInfo.start;
    const end = selectInfo.end || new Date(start.getTime() + 3600000);
    
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
      color: '#059669',
      category_id: null,
      recurrence_rule: null,
      recurrence_end_date: null,
    });
    setSelectedEvent(null);
    setIsNewEvent(true);
    setIsEventModalOpen(true);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const eventId = clickInfo.event.id.split('-')[0];
    const event = events.find((e) => e.id === eventId);
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
        color: event.color || '#059669',
        category_id: event.category_id || null,
        recurrence_rule: event.recurrence_rule || null,
        recurrence_end_date: event.recurrence_end_date || null,
      });
      setIsNewEvent(false);
      setIsEventModalOpen(true);
    }
  };

  const handleCreateEvent = () => {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 3600000);
    
    setFormData({
      title: '',
      description: '',
      start: now.toISOString().slice(0, 16),
      end: oneHourLater.toISOString().slice(0, 16),
      all_day: false,
      color: '#059669',
      category_id: null,
      recurrence_rule: null,
      recurrence_end_date: null,
    });
    setSelectedEvent(null);
    setIsNewEvent(true);
    setIsEventModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
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

    const eventData: LocalEvent = {
      id: isNewEvent ? Date.now().toString() : selectedEvent!.id,
      title: formData.title,
      description: formData.description || null,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      status: 'scheduled',
      all_day: formData.all_day,
      color: formData.color,
      category_id: formData.category_id,
      recurrence_rule: formData.recurrence_rule,
      recurrence_end_date: formData.recurrence_end_date,
      calendar_id: 'default',
    };

    if (isNewEvent) {
      setEvents([...events, eventData]);
    } else {
      setEvents(events.map((e) => (e.id === eventData.id ? eventData : e)));
    }

    setIsEventModalOpen(false);
  };

  const handleDelete = () => {
    if (selectedEvent) {
      setEvents(events.filter((e) => e.id !== selectedEvent.id));
      setIsEventModalOpen(false);
    }
  };

  const handleEventDrop = (dropInfo: any) => {
    const eventId = dropInfo.event.id.split('-')[0];
    const event = events.find((e) => e.id === eventId);
    if (event && dropInfo.event.start) {
      const duration = new Date(event.end).getTime() - new Date(event.start).getTime();
      const newStart = dropInfo.event.start;
      const newEnd = new Date(newStart.getTime() + duration);
      
      setEvents(
        events.map((e) =>
          e.id === event.id
            ? {
                ...e,
                start: newStart.toISOString(),
                end: newEnd.toISOString(),
              }
            : e
        )
      );
    }
  };

  const handleEventResize = (resizeInfo: any) => {
    const eventId = resizeInfo.event.id.split('-')[0];
    const event = events.find((e) => e.id === eventId);
    if (event && resizeInfo.event.start && resizeInfo.event.end) {
      setEvents(
        events.map((e) =>
          e.id === event.id
            ? {
                ...e,
                start: resizeInfo.event.start.toISOString(),
                end: resizeInfo.event.end.toISOString(),
              }
            : e
        )
      );
    }
  };

  useEffect(() => {
    const handleCreateEventEvent = () => {
      handleCreateEvent();
    };
    const handleOpenTaskPanel = () => {
      setIsTaskPanelOpen(true);
    };
    window.addEventListener('create-event', handleCreateEventEvent);
    window.addEventListener('open-task-panel', handleOpenTaskPanel);
    return () => {
      window.removeEventListener('create-event', handleCreateEventEvent);
      window.removeEventListener('open-task-panel', handleOpenTaskPanel);
    };
  }, []);

  // Mini calendar helpers
  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  const endDate = new Date(monthEnd);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const days = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  // Calculate insights summary
  const insightsSummary = useMemo(() => {
    return calculateInsightsSummary(events, categories);
  }, [events, categories]);

  return (
    <div className="min-h-screen py-6">
      {/* Dashboard Shell */}
      <div className="dashboard-shell">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 h-[calc(100vh-120px)]">
          {/* Left Sidebar */}
          <aside className="space-y-4 overflow-y-auto pr-2">
            {/* Profile Card */}
            <Card className="sidebar-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#EFBF4D] to-[#4FB3B3] flex items-center justify-center text-white font-semibold text-lg shadow-sm">
                  {user?.user_metadata?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text)]">
                    {user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}
                  </h3>
                  <p className="text-sm text-[var(--muted)]">Calendar</p>
                </div>
              </div>
              <button
                onClick={handleCreateEvent}
                className="w-full bg-[var(--text)] text-white rounded-lg py-2.5 font-medium hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
              >
                + Add Event
              </button>
            </Card>

            {/* Upcoming Event Card */}
            {upcomingEvent && (
              <Card className="sidebar-card p-4 border-l-2" style={{
                borderLeftColor: categories.find(c => c.id === upcomingEvent.category_id)?.color || '#059669',
              }}>
                <p className="text-xs font-medium text-[var(--muted)] mb-2 uppercase tracking-wide">Upcoming event</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0 shadow-sm"
                      style={{
                        backgroundColor: categories.find(c => c.id === upcomingEvent.category_id)?.color || '#059669',
                      }}
                    />
                    <span className="text-sm font-medium text-[var(--text)] truncate">
                      {upcomingEvent.title}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--muted)] ml-2 flex-shrink-0 font-medium">
                    {formatTime(new Date(upcomingEvent.start))}
                  </span>
                </div>
              </Card>
            )}

            {/* Mini Month Calendar */}
            <Card className="sidebar-card">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => {
                    const prev = new Date(selectedDate);
                    prev.setMonth(prev.getMonth() - 1);
                    setSelectedDate(prev);
                  }}
                  className="text-[var(--muted)] hover:text-[var(--text)] transition-colors w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--border)]"
                >
                  ‹
                </button>
                <h4 className="text-sm font-bold text-[var(--text)]">
                  {formatMonthYear(selectedDate)}
                </h4>
                <button
                  onClick={() => {
                    const next = new Date(selectedDate);
                    next.setMonth(next.getMonth() + 1);
                    setSelectedDate(next);
                  }}
                  className="text-[var(--muted)] hover:text-[var(--text)] transition-colors w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--border)]"
                >
                  ›
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="text-xs text-center text-[var(--muted)] font-semibold py-1">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, i) => {
                  const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
                  const isToday = day.toDateString() === new Date().toDateString();
                  const isSelected = day.toDateString() === selectedDate.toDateString();
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(day)}
                      className={`text-xs py-1.5 rounded transition-all ${
                        !isCurrentMonth ? 'text-[var(--muted)] opacity-40' : 'text-[var(--text)]'
                      } ${
                        isToday
                          ? 'bg-[var(--text)] text-white font-bold shadow-sm'
                          : isSelected
                          ? 'bg-[var(--border)] font-semibold'
                          : 'hover:bg-[var(--border)]'
                      }`}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Insights Card */}
            <InsightsCard insights={insightsSummary} />

            {/* Time Breakdown */}
            <Card className="sidebar-card">
              <h4 className="text-sm font-bold text-[var(--text)] mb-4">Time Breakdown</h4>
              <div className="space-y-3">
                {[
                  { label: 'Meetings', value: breakdown.meetings, color: '#3B82F6' },
                  { label: 'Projects', value: breakdown.projects, color: '#10B981' },
                  { label: 'Education', value: breakdown.education, color: '#8B5CF6' },
                  { label: 'Events', value: breakdown.events, color: '#EF4444' },
                  { label: 'Reviews', value: breakdown.reviews, color: '#F59E0B' },
                ].map((item, index) => (
                  <div key={item.label} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-[var(--muted)] font-medium">{item.label}</span>
                      <span className="text-[var(--text)] font-semibold">{item.value}</span>
                    </div>
                    <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${(item.value / total) * 100}%`,
                          backgroundColor: item.color,
                          animation: `slideIn 0.5s ease-out ${index * 50}ms both`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </aside>

          {/* Main Calendar Area */}
          <div className="flex flex-col overflow-hidden">
            {/* Pilot Brief */}
            <PilotBrief
              events={events as PilotBriefLocalEvent[]}
              tasks={tasks}
              onScheduleTask={(task, start, end) => {
                setFormData({
                  title: task.title,
                  description: task.description || '',
                  start: start.toISOString().slice(0, 16),
                  end: end.toISOString().slice(0, 16),
                  all_day: false,
                  color: task.category_id 
                    ? categories.find((c) => c.id === task.category_id)?.color || '#059669'
                    : '#059669',
                  category_id: task.category_id,
                  recurrence_rule: null,
                  recurrence_end_date: null,
                });
                setIsNewEvent(true);
                setIsEventModalOpen(true);
              }}
              onCompleteTask={(taskId) => {
                setTasks(tasks.map((t) => 
                  t.id === taskId ? { ...t, status: 'completed' as TaskStatus } : t
                ));
              }}
            />

            {/* Header with Segmented Control */}
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-[var(--text)]">
                {formatMonthYear(currentDate)}
              </h1>
              <div className="flex items-center gap-3">
                <div className="segmented-control">
                  <button
                    onClick={() => setCurrentView('dayGridMonth')}
                    className={`segmented-control-button ${currentView === 'dayGridMonth' ? 'active' : ''}`}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setCurrentView('timeGridWeek')}
                    className={`segmented-control-button ${currentView === 'timeGridWeek' ? 'active' : ''}`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setCurrentView('timeGridDay')}
                    className={`segmented-control-button ${currentView === 'timeGridDay' ? 'active' : ''}`}
                  >
                    Day
                  </button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const today = new Date();
                    setCurrentDate(today);
                    setSelectedDate(today);
                  }}
                  className="!px-4"
                >
                  Today
                </Button>
              </div>
            </div>

            {/* Calendar */}
            <div className="flex-1 overflow-hidden">
              <FullCalendar
                plugins={[
                  dayGridPlugin,
                  timeGridPlugin,
                ]}
                initialView={currentView}
                headerToolbar={false}
                events={filteredEvents}
                eventClick={handleEventClick}
                selectable={true}
                selectMirror={true}
                select={handleDateSelect}
                editable={true}
                droppable={true}
                eventDrop={handleEventDrop}
                eventResize={handleEventResize}
                height="100%"
                dayMaxEvents={true}
                moreLinkClick="popover"
                datesSet={handleViewChange}
                nowIndicator={true}
                slotMinTime="06:00:00"
                slotMaxTime="22:00:00"
                allDaySlot={true}
                firstDay={0}
                eventDisplay="block"
                eventTimeFormat={{
                  hour: 'numeric',
                  minute: '2-digit',
                  meridiem: 'short',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Event Modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4" onClick={() => setIsEventModalOpen(false)}>
          <div className="modal-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-[var(--text)]">
                {isNewEvent ? 'Add Event' : 'Edit Event'}
              </h2>
              <button
                onClick={() => setIsEventModalOpen(false)}
                className="text-[var(--muted)] hover:text-[var(--text)] transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--surface-2)]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="title" className="text-sm font-semibold text-[var(--text)] mb-2 block">
                  Title
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                  className="mt-1"
                  placeholder="Event title"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-semibold text-[var(--text)] mb-2 block">
                  Description
                </Label>
                <textarea
                  id="description"
                  className="w-full mt-1 px-4 py-3 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4FB3B3] bg-[var(--surface)] transition-all resize-none"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  placeholder="Add details..."
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="start" className="text-sm font-semibold text-[var(--text)] mb-2 block">
                    {formData.all_day ? 'Date' : 'Start'}
                  </Label>
                  <Input
                    id="start"
                    type={formData.all_day ? 'date' : 'datetime-local'}
                    value={formData.start}
                    onChange={(e) =>
                      setFormData({ ...formData, start: e.target.value })
                    }
                    required
                    className="mt-1"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="end" className="text-sm font-semibold text-[var(--text)] mb-2 block">
                    {formData.all_day ? 'End Date' : 'End'}
                  </Label>
                  <Input
                    id="end"
                    type={formData.all_day ? 'date' : 'datetime-local'}
                    value={formData.end}
                    onChange={(e) =>
                      setFormData({ ...formData, end: e.target.value })
                    }
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-[var(--surface-2)] rounded-lg">
                <input
                  type="checkbox"
                  id="all_day"
                  checked={formData.all_day}
                  onChange={(e) =>
                    setFormData({ ...formData, all_day: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-[var(--border)]"
                />
                <Label htmlFor="all_day" className="text-sm text-[var(--text)] font-medium cursor-pointer">
                  All-day event
                </Label>
              </div>

              <div>
                <Label htmlFor="category" className="text-sm font-semibold text-[var(--text)] mb-3 block">
                  Category
                </Label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, category_id: null })}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      formData.category_id === null
                        ? 'bg-[var(--text)] text-white shadow-sm'
                        : 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border)] hover:scale-105'
                    }`}
                  >
                    None
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, category_id: category.id })}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                        formData.category_id === category.id
                          ? 'bg-[var(--text)] text-white shadow-sm'
                          : 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border)] hover:scale-105'
                      }`}
                    >
                      {category.icon && <span>{category.icon}</span>}
                      <span>{category.name}</span>
                    </button>
                  ))}
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

              <div className="flex gap-3 pt-6 border-t border-[var(--border)]">
                <Button
                  type="submit"
                  size="lg"
                  className="flex-1 !bg-[var(--text)] !text-white hover:!opacity-90 hover:!scale-[1.02] active:!scale-[0.98] !shadow-md !font-semibold"
                >
                  {isNewEvent ? 'Add Event' : 'Update Event'}
                </Button>
                {!isNewEvent && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={handleDelete}
                    className="!text-red-600 !border-red-600 hover:!bg-red-50 hover:!scale-[1.02] active:!scale-[0.98]"
                  >
                    Delete
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Panel */}
      {isTaskPanelOpen && (
        <TaskPanel
          tasks={tasks}
          setTasks={setTasks}
          onClose={() => setIsTaskPanelOpen(false)}
          onConvertToEvent={(task) => {
            const duration = task.duration || 60;
            const start = task.due_date ? new Date(task.due_date) : new Date();
            const end = new Date(start.getTime() + duration * 60000);
            
            setFormData({
              title: task.title,
              description: task.description || '',
              start: start.toISOString().slice(0, 16),
              end: end.toISOString().slice(0, 16),
              all_day: false,
              color: task.category_id 
                ? categories.find((c) => c.id === task.category_id)?.color || '#059669'
                : '#059669',
              category_id: task.category_id,
              recurrence_rule: null,
              recurrence_end_date: null,
            });
            setIsNewEvent(true);
            setIsEventModalOpen(true);
            setIsTaskPanelOpen(false);
          }}
        />
      )}
    </div>
  );
}

// Task Panel Component
function TaskPanel({
  tasks,
  setTasks,
  onClose,
  onConvertToEvent,
}: {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  onClose: () => void;
  onConvertToEvent: (task: Task) => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    due_date: '',
    duration: '60',
    priority: 'medium' as TaskPriority,
    category_id: null as string | null,
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    const newTask: Task = {
      id: Date.now().toString(),
      user_id: 'local',
      title: taskForm.title,
      description: taskForm.description || null,
      due_date: taskForm.due_date || null,
      duration: parseInt(taskForm.duration) || null,
      priority: taskForm.priority,
      status: 'pending',
      category_id: taskForm.category_id,
      converted_to_event_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTasks([...tasks, newTask]);
    setTaskForm({
      title: '',
      description: '',
      due_date: '',
      duration: '60',
      priority: 'medium',
      category_id: null,
    });
    setIsCreating(false);
  };

  const handleCompleteTask = (taskId: string) => {
    setTasks(tasks.map((t) => 
      t.id === taskId ? { ...t, status: 'completed' as TaskStatus } : t
    ));
  };

  const pendingTasks = tasks.filter((t) => t.status !== 'completed');

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-[var(--surface)] border-l border-[var(--border)] z-40 overflow-y-auto shadow-lg">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[var(--text)]">Tasks</h2>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--text)]"
          >
            ✕
          </button>
        </div>

        {!isCreating ? (
          <Button onClick={() => setIsCreating(true)} className="w-full mb-4">
            + New Task
          </Button>
        ) : (
          <Card className="mb-4 bg-[var(--surface-2)]">
            <form onSubmit={handleCreateTask} className="space-y-3 p-4">
              <div>
                <Label htmlFor="task-title">Title</Label>
                <Input
                  id="task-title"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="task-due">Due Date</Label>
                <Input
                  id="task-due"
                  type="datetime-local"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="task-duration">Duration (minutes)</Label>
                <Input
                  id="task-duration"
                  type="number"
                  value={taskForm.duration}
                  onChange={(e) => setTaskForm({ ...taskForm, duration: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="task-priority">Priority</Label>
                <select
                  id="task-priority"
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}
                  className="w-full px-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Create</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreating(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        <div className="space-y-2">
          {pendingTasks.length === 0 ? (
            <p className="text-sm text-[var(--muted)] text-center py-4">No pending tasks</p>
          ) : (
            pendingTasks.map((task) => (
              <Card key={task.id} className="p-3 bg-[var(--surface-2)]">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${
                        task.priority === 'high' ? 'bg-red-500' :
                        task.priority === 'medium' ? 'bg-yellow-500' : 'bg-gray-400'
                      }`} />
                      <h4 className="font-medium text-[var(--text)]">{task.title}</h4>
                    </div>
                    {task.due_date && (
                      <p className="text-xs text-[var(--muted)]">
                        Due: {new Date(task.due_date).toLocaleString()}
                      </p>
                    )}
                    {task.duration && (
                      <p className="text-xs text-[var(--muted)]">
                        {task.duration} min
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {task.due_date && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onConvertToEvent(task)}
                        className="!text-xs"
                      >
                        Schedule
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCompleteTask(task.id)}
                      className="!text-xs"
                    >
                      ✓
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
