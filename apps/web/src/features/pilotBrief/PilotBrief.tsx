import { useState, useEffect, useMemo } from 'react';
import { Button } from '@daypilot/ui';
import type { LocalEvent, ScheduleRisk } from './pilotBriefTypes';
import type { Task, Category } from '@daypilot/types';
import {
  calculateTodayOverview,
  getTopPriorities,
  generateSuggestions,
} from './pilotBriefSelectors';
import { detectScheduleRisks } from './pilotBriefUtils';
import { formatDuration, formatTime } from './pilotBriefUtils';
import { PilotBriefCard } from './PilotBriefCard';
import { PilotBriefSection } from './PilotBriefSection';
import { PriorityTaskRow } from './PriorityTaskRow';
import { RiskCard } from './RiskCard';
import { SuggestionCard } from './SuggestionCard';
import type { Suggestion } from './pilotBriefTypes';

const DEFAULT_WORKING_HOURS_START = 480; // 8:00 AM
const DEFAULT_WORKING_HOURS_END = 1020; // 5:00 PM

interface PilotBriefProps {
  events: LocalEvent[];
  tasks: Task[];
  categories?: Category[];
  onScheduleTask: (task: Task, start: Date, end: Date) => void;
  onCompleteTask: (taskId: string) => void;
  onDismiss?: () => void;
}

export function PilotBrief({
  events,
  tasks,
  onScheduleTask,
  onCompleteTask,
  onDismiss,
}: PilotBriefProps) {
  const [dismissed, setDismissed] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [showConfirmModal, setShowConfirmModal] = useState<Suggestion | null>(null);

  // Check if dismissed for today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const dismissedKey = `pilotBriefDismissed_${today}`;
    const isDismissed = localStorage.getItem(dismissedKey) === 'true';
    setDismissed(isDismissed);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showConfirmModal) {
        setShowConfirmModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showConfirmModal]);

  // Calculate data
  const overview = useMemo(
    () => calculateTodayOverview(events, tasks, DEFAULT_WORKING_HOURS_START, DEFAULT_WORKING_HOURS_END),
    [events, tasks]
  );

  const topPriorities = useMemo(() => getTopPriorities(tasks, 3), [tasks]);

  const risks = useMemo(
    () => detectScheduleRisks(events, tasks, DEFAULT_WORKING_HOURS_START, DEFAULT_WORKING_HOURS_END),
    [events, tasks]
  );

  const allSuggestions = useMemo(
    () => generateSuggestions(events, tasks, risks, DEFAULT_WORKING_HOURS_START, DEFAULT_WORKING_HOURS_END),
    [events, tasks, risks]
  );

  const suggestions = useMemo(
    () => allSuggestions.filter(s => {
      if (s.type === 'schedule_task') {
        return !dismissedSuggestions.has(`task_${s.task.id}_${s.suggestedStart.getTime()}`);
      }
      if (s.type === 'add_break') {
        return !dismissedSuggestions.has(`break_${s.suggestedStart.getTime()}`);
      }
      if (s.type === 'move_event') {
        return !dismissedSuggestions.has(`move_${s.event.id}`);
      }
      return true;
    }),
    [allSuggestions, dismissedSuggestions]
  );

  const handleDismiss = () => {
    const today = new Date().toISOString().split('T')[0];
    const dismissedKey = `pilotBriefDismissed_${today}`;
    localStorage.setItem(dismissedKey, 'true');
    setDismissed(true);
    onDismiss?.();
  };

  const handleApplySuggestion = (suggestion: Suggestion) => {
    if (suggestion.type === 'move_event') {
      // Show confirmation modal for moving events
      setShowConfirmModal(suggestion);
      return;
    }

    // Apply task scheduling or break directly
    if (suggestion.type === 'schedule_task') {
      onScheduleTask(suggestion.task, suggestion.suggestedStart, suggestion.suggestedEnd);
      // Dismiss this specific suggestion
      setDismissedSuggestions(prev => new Set(prev).add(`task_${suggestion.task.id}_${suggestion.suggestedStart.getTime()}`));
    } else if (suggestion.type === 'add_break') {
      // Create a break event - this would need to be handled by parent component
      // For now, we'll just dismiss the suggestion
      setDismissedSuggestions(prev => new Set(prev).add(`break_${suggestion.suggestedStart.getTime()}`));
    }
  };

  const handleDismissSuggestion = (suggestion: Suggestion) => {
    if (suggestion.type === 'schedule_task') {
      setDismissedSuggestions(prev => new Set(prev).add(`task_${suggestion.task.id}_${suggestion.suggestedStart.getTime()}`));
    } else if (suggestion.type === 'add_break') {
      setDismissedSuggestions(prev => new Set(prev).add(`break_${suggestion.suggestedStart.getTime()}`));
    } else if (suggestion.type === 'move_event') {
      setDismissedSuggestions(prev => new Set(prev).add(`move_${suggestion.event.id}`));
    }
  };

  const handleConfirmMoveEvent = () => {
    if (showConfirmModal && showConfirmModal.type === 'move_event') {
      // This would need to be handled by parent component to update the event
      // For now, we'll just dismiss
      handleDismissSuggestion(showConfirmModal);
      setShowConfirmModal(null);
    }
  };

  if (dismissed) {
    return null;
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <>
      <PilotBriefCard className="mb-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-[var(--text)] mb-1">Pilot Brief</h2>
            <p className="text-sm text-[var(--muted)]">{formatDate(overview.date)}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDismiss}
            className="!text-xs"
            aria-label="Dismiss Pilot Brief for today"
          >
            Dismiss for Today
          </Button>
        </div>

        {/* Today Overview */}
        <PilotBriefSection title="Today Overview">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-[var(--surface-2)] rounded-lg transition-all hover:shadow-sm">
              <div className="text-2xl font-bold text-[var(--text)] mb-1">
                {formatDuration(overview.totalScheduledMinutes)}
              </div>
              <div className="text-xs text-[var(--muted)] font-medium">Scheduled</div>
            </div>
            <div className="text-center p-4 bg-[var(--surface-2)] rounded-lg transition-all hover:shadow-sm">
              <div className="text-2xl font-bold text-[var(--text)] mb-1">
                {formatDuration(overview.freeTimeMinutes)}
              </div>
              <div className="text-xs text-[var(--muted)] font-medium">Free Time</div>
            </div>
            <div className="text-center p-4 bg-[var(--surface-2)] rounded-lg transition-all hover:shadow-sm">
              <div className="text-2xl font-bold text-[var(--text)] mb-1">
                {overview.numberOfEvents}
              </div>
              <div className="text-xs text-[var(--muted)] font-medium">Events</div>
            </div>
            <div className="text-center p-4 bg-[var(--surface-2)] rounded-lg transition-all hover:shadow-sm">
              <div className="text-2xl font-bold text-[var(--text)] mb-1">
                {overview.numberOfTasks}
              </div>
              <div className="text-xs text-[var(--muted)] font-medium">Tasks</div>
            </div>
          </div>
        </PilotBriefSection>

        {/* Top Priorities */}
        {topPriorities.length > 0 ? (
          <PilotBriefSection title="Top Priorities">
            <div className="space-y-2">
              {topPriorities.map((priorityTask) => (
                <PriorityTaskRow
                  key={priorityTask.task.id}
                  priorityTask={priorityTask}
                  onSchedule={(task) => {
                    // Find best slot for this task
                    const slots = generateSuggestions(events, [task], risks, DEFAULT_WORKING_HOURS_START, DEFAULT_WORKING_HOURS_END)
                      .filter(s => s.type === 'schedule_task' && s.task.id === task.id) as Array<{ task: Task; suggestedStart: Date; suggestedEnd: Date }>;
                    if (slots.length > 0) {
                      onScheduleTask(task, slots[0].suggestedStart, slots[0].suggestedEnd);
                    }
                  }}
                  onComplete={onCompleteTask}
                />
              ))}
            </div>
          </PilotBriefSection>
        ) : (
          <PilotBriefSection title="Top Priorities">
            <div className="text-center py-6 text-sm text-[var(--muted)]">
              <p>No priorities set</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // This would open task panel - handled by parent
                  window.dispatchEvent(new CustomEvent('open-task-panel'));
                }}
                className="mt-2"
              >
                Add a Task
              </Button>
            </div>
          </PilotBriefSection>
        )}

        {/* Schedule Risks */}
        {risks.length > 0 ? (
          <PilotBriefSection title="Schedule Risks">
            <div className="space-y-3">
              {risks.map((risk: ScheduleRisk, index: number) => (
                <RiskCard
                  key={`${risk.type}_${index}`}
                  risk={risk}
                  onViewSuggestions={() => {
                    // Scroll to suggestions section
                    document.getElementById('pilot-brief-suggestions')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                />
              ))}
            </div>
          </PilotBriefSection>
        ) : (
          <PilotBriefSection title="Schedule Risks">
            <div className="text-center py-4 text-sm text-[var(--muted)]">
              You're in good shape today! 🎉
            </div>
          </PilotBriefSection>
        )}

        {/* Smart Suggestions */}
        {suggestions.length > 0 ? (
          <PilotBriefSection title="Smart Suggestions" className="mb-0">
            <div id="pilot-brief-suggestions" className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <SuggestionCard
                  key={`${suggestion.type}_${index}`}
                  suggestion={suggestion}
                  onApply={handleApplySuggestion}
                  onDismiss={handleDismissSuggestion}
                />
              ))}
            </div>
          </PilotBriefSection>
        ) : overview.numberOfEvents === 0 && topPriorities.length === 0 ? (
          <PilotBriefSection title="Smart Suggestions">
            <div className="text-center py-6 text-sm text-[var(--muted)]">
              <p className="mb-2">Open schedule</p>
              <p className="text-xs">Consider scheduling your top tasks</p>
            </div>
          </PilotBriefSection>
        ) : null}
      </PilotBriefCard>

      {/* Confirmation Modal for Moving Events */}
      {showConfirmModal && showConfirmModal.type === 'move_event' && (
        <div 
          className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4" 
          onClick={() => setShowConfirmModal(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <div className="modal-card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 id="confirm-modal-title" className="text-lg font-bold text-[var(--text)] mb-4">
              Confirm Event Move
            </h3>
            <div className="space-y-3 mb-6">
              <div>
                <p className="text-sm text-[var(--muted)] mb-1">Event:</p>
                <p className="font-medium text-[var(--text)]">{showConfirmModal.event.title}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted)] mb-1">Current Time:</p>
                <p className="font-medium text-[var(--text)]">
                  {formatTime(showConfirmModal.currentStart)} - {formatTime(showConfirmModal.currentEnd)}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted)] mb-1">New Time:</p>
                <p className="font-medium text-[var(--text)]">
                  {formatTime(showConfirmModal.suggestedStart)} - {formatTime(showConfirmModal.suggestedEnd)}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted)]">{showConfirmModal.reason}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleConfirmMoveEvent}
                className="flex-1 !bg-[var(--text)] !text-white"
                aria-label="Apply event move"
              >
                Apply
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowConfirmModal(null)}
                className="flex-1"
                aria-label="Cancel event move"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
