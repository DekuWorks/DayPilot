import { Outlet } from 'react-router-dom';

export function OnboardingWrapper() {
  // Temporarily disable onboarding gating and always show the main app.
  // Users already have a personal calendar by default, so we can safely
  // drop them straight into the dashboard experience.
  return <Outlet />;
}
