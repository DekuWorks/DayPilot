import { useMemo } from 'react';
import { Card, Button } from '@daypilot/ui';
import { useNavigate } from 'react-router-dom';
import {
  getEvents,
  getCategories,
} from '@daypilot/lib';
import { calculateWeeklyInsights } from '../../features/insights/insightsSelectors';
import type { LocalEvent } from '../../features/insights/insightsTypes';
import type { Category } from '@daypilot/types';
import { formatDuration } from '../../features/pilotBrief/pilotBriefUtils';
import { useState, useEffect } from 'react';

export function InsightsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [eventsData, categoriesData] = await Promise.all([
          getEvents(),
          getCategories(),
        ]);
        setEvents(eventsData as LocalEvent[]);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Failed to load insights data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const weeklyInsights = useMemo(() => {
    if (events.length === 0 || loading) return null;
    return calculateWeeklyInsights(events, categories);
  }, [events, categories, loading]);

  if (loading) {
    return (
      <div className="min-h-screen py-6">
        <div className="dashboard-shell">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4FB3B3] mx-auto mb-4"></div>
              <p className="text-[var(--muted)]">Loading insights...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!weeklyInsights) {
    return (
      <div className="min-h-screen py-6">
        <div className="dashboard-shell">
          <div className="text-center py-12">
            <p className="text-[var(--muted)] mb-4">No data available</p>
            <Button onClick={() => navigate('/app')}>Go to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen py-6">
      <div className="dashboard-shell">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Weekly Insights</h1>
              <p className="text-[var(--muted)]">Your time breakdown for the past 7 days</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/app')}>
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="sidebar-card p-6">
            <div className="text-sm text-[var(--muted)] mb-2">Total Scheduled</div>
            <div className="text-3xl font-bold text-[var(--text)]">
              {formatDuration(weeklyInsights.totalScheduledMinutes)}
            </div>
          </Card>
          <Card className="sidebar-card p-6">
            <div className="text-sm text-[var(--muted)] mb-2">Meeting Time</div>
            <div className="text-3xl font-bold text-[var(--text)]">
              {formatDuration(weeklyInsights.totalMeetingMinutes)}
            </div>
          </Card>
          <Card className="sidebar-card p-6">
            <div className="text-sm text-[var(--muted)] mb-2">Focus Time</div>
            <div className="text-3xl font-bold text-[var(--text)]">
              {formatDuration(weeklyInsights.totalFocusTimeMinutes)}
            </div>
          </Card>
          <Card className="sidebar-card p-6">
            <div className="text-sm text-[var(--muted)] mb-2">Overbooked Days</div>
            <div className="text-3xl font-bold text-[var(--text)]">
              {weeklyInsights.overbookedDaysCount}
            </div>
          </Card>
        </div>

        {/* Most Overloaded Day */}
        {weeklyInsights.mostOverloadedDay && weeklyInsights.mostOverloadedDay.busyRatio > 0.7 && (
          <Card className="sidebar-card p-6 mb-8 border-l-4 border-red-500 bg-red-50">
            <div className="flex items-start gap-4">
              <div className="text-3xl">⚠️</div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-900 mb-2">Most Overloaded Day</h3>
                <p className="text-red-800 mb-2">
                  {formatDate(weeklyInsights.mostOverloadedDay.date)} was your busiest day
                </p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-red-700">Scheduled: </span>
                    <span className="font-semibold">{formatDuration(weeklyInsights.mostOverloadedDay.totalScheduledMinutes)}</span>
                  </div>
                  <div>
                    <span className="text-red-700">Density: </span>
                    <span className="font-semibold">{Math.round(weeklyInsights.mostOverloadedDay.busyRatio * 100)}%</span>
                  </div>
                  <div>
                    <span className="text-red-700">Meeting Load: </span>
                    <span className="font-semibold">{Math.round(weeklyInsights.mostOverloadedDay.meetingLoadPercent)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* 7-Day Summary Table */}
        <Card className="sidebar-card p-6 mb-8">
          <h2 className="text-xl font-bold text-[var(--text)] mb-4">7-Day Summary</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--text)]">Day</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-[var(--text)]">Scheduled</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-[var(--text)]">Meetings</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-[var(--text)]">Focus</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-[var(--text)]">Density</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-[var(--text)]">Avg Gap</th>
                </tr>
              </thead>
              <tbody>
                {weeklyInsights.days.map((day, index) => (
                  <tr
                    key={index}
                    className={`border-b border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors ${
                      day.isOverbooked ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-[var(--text)]">
                        {formatDate(day.date)}
                      </div>
                      {day.isOverbooked && (
                        <span className="text-xs text-red-600 font-semibold">Overbooked</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-[var(--text)]">
                      {formatDuration(day.totalScheduledMinutes)}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-[var(--text)]">
                      {formatDuration(day.meetingMinutes)}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-[var(--text)]">
                      {formatDuration(day.focusTimeMinutes)}
                    </td>
                    <td className="py-3 px-4 text-right text-sm">
                      <span className={`font-semibold ${
                        day.busyRatio > 0.85 ? 'text-red-600' :
                        day.busyRatio > 0.70 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {Math.round(day.busyRatio * 100)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-[var(--text)]">
                      {formatDuration(day.avgGapMinutes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Top Categories */}
        {weeklyInsights.topCategories.length > 0 && (
          <Card className="sidebar-card p-6">
            <h2 className="text-xl font-bold text-[var(--text)] mb-4">Top Categories by Time</h2>
            <div className="space-y-3">
              {weeklyInsights.topCategories.map(({ category, totalMinutes }, index) => (
                <div key={category?.id || 'none'} className="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{
                        backgroundColor: category?.color || '#6B7280',
                      }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-[var(--text)]">
                        {category?.name || 'Uncategorized'}
                      </div>
                      <div className="text-xs text-[var(--muted)]">
                        {Math.round((totalMinutes / weeklyInsights.totalScheduledMinutes) * 100)}% of total time
                      </div>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-[var(--text)]">
                    {formatDuration(totalMinutes)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
