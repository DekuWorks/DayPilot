import { Card, Button } from '@daypilot/ui';
import type { ScheduleRisk } from './pilotBriefTypes';

interface RiskCardProps {
  risk: ScheduleRisk;
  onViewSuggestions?: () => void;
}

export function RiskCard({ risk, onViewSuggestions }: RiskCardProps) {
  const severityColors = {
    high: 'border-red-300 bg-red-50',
    medium: 'border-yellow-300 bg-yellow-50',
    low: 'border-blue-300 bg-blue-50',
  };
  
  const severityIcons = {
    high: '⚠️',
    medium: '⚡',
    low: 'ℹ️',
  };
  
  return (
    <Card className={`p-4 border-l-4 ${severityColors[risk.severity]} transition-all hover:shadow-md`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{severityIcons[risk.severity]}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-[var(--text)] mb-1">{risk.headline}</h4>
          <p className="text-sm text-[var(--muted)] mb-3">{risk.description}</p>
          {onViewSuggestions && (
            <Button
              size="sm"
              variant="outline"
              onClick={onViewSuggestions}
              className="!text-xs"
            >
              See Suggestions
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
