import { Card } from '@daypilot/ui';

export function TodayPage() {
  return (
    <div className="container-width section-padding py-8">
      <h1 className="text-3xl font-bold mb-6 text-[#2B3448]">Today</h1>

      <Card className="glass-effect">
        <div className="p-6">
          <p className="text-[#4f4f4f]">
            Welcome to DayPilot! The calendar is ready. Events will be available
            once the database is fully set up.
          </p>
        </div>
      </Card>
    </div>
  );
}
