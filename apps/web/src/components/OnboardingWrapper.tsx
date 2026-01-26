import { useOrganizations } from '@daypilot/lib';
import { OnboardingFlow } from './OnboardingFlow';
import { Outlet } from 'react-router-dom';

export function OnboardingWrapper() {
  const { data: organizations, isLoading } = useOrganizations();

  // Show onboarding if user has no organizations yet
  // (Everyone gets a personal calendar automatically, so we only check for orgs)
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#4f4f4f]">Loading...</div>
      </div>
    );
  }

  // If user has no organizations, show onboarding (optional setup)
  // But they can skip it since they already have their personal calendar
  if (organizations && organizations.length === 0) {
    return <OnboardingFlow />;
  }

  // User has organizations or skipped onboarding, show the app
  return <Outlet />;
}
