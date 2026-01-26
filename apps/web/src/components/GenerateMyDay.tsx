import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Badge } from '@daypilot/ui';
import {
  useGenerateDay,
  useApplyAIAction,
  useUndoAIAction,
  useLatestAIAction,
  useEntitlements,
  canUseAI,
} from '@daypilot/lib';
import { useCalendars, useEvents } from '@daypilot/lib';
import { formatTime, isToday } from '@daypilot/lib';
import type { AIBlock } from '@daypilot/types';

interface GenerateMyDayProps {
  onScheduleGenerated?: () => void;
}

export function GenerateMyDay({ onScheduleGenerated }: GenerateMyDayProps) {
  const [backlogTasks, setBacklogTasks] = useState<
    Array<{
      title: string;
      description?: string;
      priority?: 'high' | 'medium' | 'low';
      estimated_duration?: number;
    }>
  >([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDuration, setNewTaskDuration] = useState(60);
  const [newTaskPriority, setNewTaskPriority] = useState<
    'high' | 'medium' | 'low'
  >('medium');

  const generateDay = useGenerateDay();
  const applyAction = useApplyAIAction();
  const undoAction = useUndoAIAction();
  const { data: latestAction } = useLatestAIAction();
  const { data: calendars = [] } = useCalendars();
  const { data: events = [] } = useEvents();
  const { data: entitlements } = useEntitlements();

  const hasAIAccess = canUseAI(entitlements);

  const defaultCalendar = calendars.find(c => c.is_default);
  const todayEvents = events.filter(event => {
    const start = new Date(event.start);
    return isToday(start);
  });

  const handleGenerate = async () => {
    try {
      await generateDay.mutateAsync({
        backlog_tasks: backlogTasks.length > 0 ? backlogTasks : undefined,
      });

      if (onScheduleGenerated) {
        onScheduleGenerated();
      }
    } catch (error: any) {
      alert('Error generating day: ' + error.message);
    }
  };

  const handleApply = async () => {
    if (!latestAction || !defaultCalendar) {
      alert('No schedule to apply or no default calendar found');
      return;
    }

    try {
      await applyAction.mutateAsync({
        actionId: latestAction.id,
        blocks: latestAction.output.blocks,
        calendarId: defaultCalendar.id,
      });

      alert('Schedule applied successfully!');
      if (onScheduleGenerated) {
        onScheduleGenerated();
      }
    } catch (error: any) {
      alert('Error applying schedule: ' + error.message);
    }
  };

  const handleUndo = async () => {
    if (!latestAction || latestAction.status !== 'applied') {
      alert('No applied schedule to undo');
      return;
    }

    if (
      !confirm('Are you sure you want to undo the last AI-generated schedule?')
    ) {
      return;
    }

    try {
      await undoAction.mutateAsync(latestAction.id);
      alert('Schedule undone successfully!');
      if (onScheduleGenerated) {
        onScheduleGenerated();
      }
    } catch (error: any) {
      alert('Error undoing schedule: ' + error.message);
    }
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;

    setBacklogTasks([
      ...backlogTasks,
      {
        title: newTaskTitle,
        estimated_duration: newTaskDuration,
        priority: newTaskPriority,
      },
    ]);

    setNewTaskTitle('');
    setNewTaskDuration(60);
    setNewTaskPriority('medium');
  };

  const handleRemoveTask = (index: number) => {
    setBacklogTasks(backlogTasks.filter((_, i) => i !== index));
  };

  const hasDraftAction = latestAction?.status === 'draft';
  const hasAppliedAction = latestAction?.status === 'applied';

  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-2 text-[#2B3448]">
          Generate My Day
        </h2>
        <p className="text-gray-600 text-sm">
          Let AI create an optimized schedule for your day based on your tasks
          and existing events.
        </p>
      </div>

      {/* Backlog Tasks Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-[#2B3448]">
          Backlog Tasks (Optional)
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.target.value)}
            placeholder="Task title"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            onKeyPress={e => {
              if (e.key === 'Enter') {
                handleAddTask();
              }
            }}
          />
          <input
            type="number"
            value={newTaskDuration}
            onChange={e => setNewTaskDuration(parseInt(e.target.value) || 60)}
            placeholder="Duration (min)"
            className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            min="15"
            step="15"
          />
          <select
            value={newTaskPriority}
            onChange={e =>
              setNewTaskPriority(e.target.value as 'high' | 'medium' | 'low')
            }
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <Button size="sm" onClick={handleAddTask}>
            Add
          </Button>
        </div>

        {backlogTasks.length > 0 && (
          <div className="space-y-2">
            {backlogTasks.map((task, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <span className="font-medium">{task.title}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({task.estimated_duration} min, {task.priority})
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveTask(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Button */}
      <div className="mb-4">
        {!hasAIAccess ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 mb-2">
              AI features require a subscription. Upgrade to enable AI
              scheduling.
            </p>
            <Link to="/app/billing">
              <Button className="w-full">Upgrade to Enable AI</Button>
            </Link>
          </div>
        ) : (
          <Button
            onClick={handleGenerate}
            disabled={generateDay.isPending}
            className="w-full"
          >
            {generateDay.isPending ? 'Generating...' : 'Generate My Day'}
          </Button>
        )}
      </div>

      {/* Preview */}
      {hasDraftAction && latestAction && (
        <div className="mb-4 p-4 bg-[#4FB3B3]/10 border border-[#4FB3B3] rounded-lg">
          <h3 className="font-semibold mb-3 text-[#2B3448]">
            Preview Schedule
          </h3>

          {/* Existing Events */}
          {todayEvents.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2 text-gray-600">
                Existing Events
              </h4>
              <div className="space-y-1">
                {todayEvents.map(event => (
                  <div key={event.id} className="text-sm text-gray-600">
                    {formatTime(new Date(event.start))} - {event.title}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Proposed Blocks */}
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2 text-gray-600">
              Proposed Schedule
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {latestAction.output.blocks.map(
                (block: AIBlock, index: number) => {
                  const isExisting = todayEvents.some(
                    e => new Date(e.start).toISOString() === block.start
                  );
                  const isNew = block.type === 'task';

                  return (
                    <div
                      key={index}
                      className={`p-2 rounded text-sm ${
                        isExisting
                          ? 'bg-gray-100 text-gray-600'
                          : isNew
                            ? 'bg-[#4FB3B3]/20 border border-[#4FB3B3]'
                            : 'bg-white border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <span className="font-medium">{block.title}</span>
                          {block.reason && (
                            <span className="text-xs text-gray-500 ml-2">
                              ({block.reason})
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatTime(new Date(block.start))} -{' '}
                          {formatTime(new Date(block.end))}
                        </div>
                      </div>
                      {block.description && (
                        <div className="text-xs text-gray-500 mt-1">
                          {block.description}
                        </div>
                      )}
                      {isNew && (
                        <Badge variant="success" className="text-xs mt-1">
                          New
                        </Badge>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {/* Conflicts */}
          {latestAction.output.conflicts &&
            latestAction.output.conflicts.length > 0 && (
              <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <h4 className="text-sm font-medium mb-1 text-yellow-800">
                  Conflicts
                </h4>
                <ul className="text-xs text-yellow-700 list-disc list-inside">
                  {latestAction.output.conflicts.map((conflict, index) => (
                    <li key={index}>{conflict}</li>
                  ))}
                </ul>
              </div>
            )}

          {/* Notes */}
          {latestAction.output.notes && (
            <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded">
              <h4 className="text-sm font-medium mb-1 text-blue-800">Notes</h4>
              {Array.isArray(latestAction.output.notes) ? (
                <ul className="text-xs text-blue-700 list-disc list-inside">
                  {latestAction.output.notes.map(
                    (note: string, index: number) => (
                      <li key={index}>{note}</li>
                    )
                  )}
                </ul>
              ) : (
                <p className="text-xs text-blue-700">
                  {latestAction.output.notes}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleApply}
              disabled={applyAction.isPending}
              className="flex-1"
            >
              {applyAction.isPending ? 'Applying...' : 'Apply'}
            </Button>
            <Button
              variant="outline"
              onClick={handleGenerate}
              disabled={generateDay.isPending}
              className="flex-1"
            >
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // Discard - just clear the draft
                setBacklogTasks([]);
              }}
              className="flex-1"
            >
              Discard
            </Button>
          </div>
        </div>
      )}

      {/* Undo Button */}
      {hasAppliedAction && (
        <div className="mt-4">
          <Button
            variant="outline"
            onClick={handleUndo}
            disabled={undoAction.isPending}
            className="w-full"
          >
            {undoAction.isPending ? 'Undoing...' : 'Undo Last AI Change'}
          </Button>
        </div>
      )}
    </Card>
  );
}
