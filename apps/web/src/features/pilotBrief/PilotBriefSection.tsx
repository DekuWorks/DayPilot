import type { ReactNode } from 'react';

interface PilotBriefSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function PilotBriefSection({ title, children, className = '' }: PilotBriefSectionProps) {
  return (
    <div className={`mb-6 ${className}`}>
      <h3 className="text-sm font-bold text-[var(--text)] mb-3 uppercase tracking-wide">
        {title}
      </h3>
      {children}
    </div>
  );
}
