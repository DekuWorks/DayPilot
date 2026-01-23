import { Card, Button } from '@daypilot/ui';
import type { Suggestion } from './pilotBriefTypes';
import { formatTime, formatDuration } from './pilotBriefUtils';

interface SuggestionCardProps {
  suggestion: Suggestion;
  onApply: (suggestion: Suggestion) => void;
  onDismiss: (suggestion: Suggestion) => void;
}

export function SuggestionCard({ suggestion, onApply, onDismiss }: SuggestionCardProps) {
  const getSuggestionText = () => {
    switch (suggestion.type) {
      case 'schedule_task':
        return `Schedule "${suggestion.task.title}" at ${formatTime(suggestion.suggestedStart)} - ${formatTime(suggestion.suggestedEnd)}`;
      case 'add_break':
        return `Add a ${formatDuration(suggestion.duration)} break at ${formatTime(suggestion.suggestedStart)}`;
      case 'move_event':
        return `Move "${suggestion.event.title}" from ${formatTime(suggestion.currentStart)} to ${formatTime(suggestion.suggestedStart)}`;
    }
  };
  
  return (
    <Card className="p-4 bg-[var(--surface-2)] border-l-4 border-[#4FB3B3] transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text)] mb-1">
            {getSuggestionText()}
          </p>
          <p className="text-xs text-[var(--muted)]">{suggestion.reason}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            size="sm"
            onClick={() => onApply(suggestion)}
            className="!text-xs !px-3 !bg-[#059669] !text-white"
          >
            Apply
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDismiss(suggestion)}
            className="!text-xs !px-3"
          >
            Dismiss
          </Button>
        </div>
      </div>
    </Card>
  );
}
