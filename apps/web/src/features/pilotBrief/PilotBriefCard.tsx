import { Card } from '@daypilot/ui';
import type { ReactNode } from 'react';

interface PilotBriefCardProps {
  children: ReactNode;
  className?: string;
}

export function PilotBriefCard({ children, className = '' }: PilotBriefCardProps) {
  return (
    <Card className={`sidebar-card ${className}`}>
      {children}
    </Card>
  );
}
