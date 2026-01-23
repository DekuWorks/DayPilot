import { Button } from '@daypilot/ui';
import type { PriorityTask } from './pilotBriefTypes';
import { formatDuration } from './pilotBriefUtils';

interface PriorityTaskRowProps {
  priorityTask: PriorityTask;
  onSchedule?: (task: PriorityTask['task']) => void;
  onComplete?: (taskId: string) => void;
}

export function PriorityTaskRow({ priorityTask, onSchedule, onComplete }: PriorityTaskRowProps) {
  const { task, reason } = priorityTask;
  const today = new Date().toISOString().split('T')[0];
  const dueDate = task.due_date?.split('T')[0] || '';
  const isOverdue = dueDate < today;
  const isDueToday = dueDate === today;
  
  const priorityColors = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-gray-400',
  };
  
  const reasonLabels = {
    overdue: 'Overdue',
    due_today: 'Due Today',
    high_priority: 'High Priority',
  };
  
  return (
    <div className="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg hover:bg-[var(--border)] transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityColors[task.priority]}`} />
          <h4 className="font-medium text-[var(--text)] truncate">{task.title}</h4>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            isOverdue 
              ? 'bg-red-100 text-red-700' 
              : isDueToday 
              ? 'bg-yellow-100 text-yellow-700' 
              : 'bg-blue-100 text-blue-700'
          }`}>
            {reasonLabels[reason]}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
          {task.due_date && (
            <span>
              Due: {new Date(task.due_date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
          )}
          {task.duration && (
            <span>{formatDuration(task.duration)}</span>
          )}
        </div>
      </div>
      <div className="flex gap-2 ml-2">
        {onSchedule && !task.converted_to_event_id && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSchedule(task)}
            className="!text-xs !px-3"
          >
            Schedule
          </Button>
        )}
        {onComplete && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onComplete(task.id)}
            className="!text-xs !px-3"
          >
            ✓
          </Button>
        )}
      </div>
    </div>
  );
}
