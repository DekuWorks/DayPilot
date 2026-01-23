import { Card, Button } from '@daypilot/ui';
import { useNavigate } from 'react-router-dom';
import type { InsightsSummary } from './insightsSelectors';
import { formatDuration } from '../pilotBrief/pilotBriefUtils';

interface InsightsCardProps {
  insights: InsightsSummary;
}

export function InsightsCard({ insights }: InsightsCardProps) {
  const navigate = useNavigate();
  
  const getMeetingLoadColor = (percent: number) => {
    if (percent > 50) return 'text-red-600';
    if (percent > 30) return 'text-yellow-600';
    return 'text-green-600';
  };
  
  const getBusyRatioColor = (ratio: number) => {
    if (ratio > 0.85) return 'text-red-600';
    if (ratio > 0.70) return 'text-yellow-600';
    return 'text-green-600';
  };
  
  return (
    <Card className="sidebar-card">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-[var(--text)] uppercase tracking-wide">
          Insights
        </h4>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate('/app/insights')}
          className="!text-xs !px-2"
        >
          View All
        </Button>
      </div>
      
      <div className="space-y-4">
        {/* Meeting Load */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-[var(--muted)] font-medium">Meeting Load</span>
            <span className={`text-sm font-bold ${getMeetingLoadColor(insights.meetingLoadPercent)}`}>
              {Math.round(insights.meetingLoadPercent)}%
            </span>
          </div>
          <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(insights.meetingLoadPercent, 100)}%`,
                backgroundColor: insights.meetingLoadPercent > 50 ? '#EF4444' : insights.meetingLoadPercent > 30 ? '#F59E0B' : '#10B981',
              }}
            />
          </div>
        </div>
        
        {/* Focus Time */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-[var(--muted)] font-medium">Focus Time</span>
            <span className="text-sm font-bold text-[var(--text)]">
              {formatDuration(insights.focusTimeMinutes)}
            </span>
          </div>
        </div>
        
        {/* Busy Ratio */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-[var(--muted)] font-medium">Schedule Density</span>
            <span className={`text-sm font-bold ${getBusyRatioColor(insights.busyRatio)}`}>
              {Math.round(insights.busyRatio * 100)}%
            </span>
          </div>
          <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(insights.busyRatio * 100, 100)}%`,
                backgroundColor: insights.busyRatio > 0.85 ? '#EF4444' : insights.busyRatio > 0.70 ? '#F59E0B' : '#10B981',
              }}
            />
          </div>
        </div>
        
        {/* Overbooked Warning */}
        {insights.isOverbooked && (
          <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
            <p className="text-xs font-semibold text-red-800 mb-1">⚠️ Overbooked Today</p>
            <p className="text-xs text-red-700">
              You've scheduled {Math.round(insights.busyRatio * 100)}% of your working hours.
            </p>
          </div>
        )}
        
        {insights.overbookedDaysThisWeek > 0 && !insights.isOverbooked && (
          <div className="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
            <p className="text-xs font-semibold text-yellow-800">
              {insights.overbookedDaysThisWeek} overbooked day{insights.overbookedDaysThisWeek > 1 ? 's' : ''} this week
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
