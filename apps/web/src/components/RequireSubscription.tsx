import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '@daypilot/ui';
import { useEntitlements, canUseBookingLinks } from '@daypilot/lib';

interface RequireSubscriptionProps {
  children: ReactNode;
  feature: 'booking-links';
}

export function RequireSubscription({ children, feature }: RequireSubscriptionProps) {
  const navigate = useNavigate();
  const { data: entitlements, isLoading } = useEntitlements();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </Card>
      </div>
    );
  }

  if (feature === 'booking-links' && !canUseBookingLinks(entitlements)) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <Card className="max-w-2xl w-full">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-r from-[#EFBF4D] to-[#4FB3B3] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-[#2B3448] mb-2">Premium Feature</h1>
            <p className="text-lg text-gray-600 mb-6">
              Booking Links are available for premium subscribers. Upgrade to create shareable booking links that let anyone book time with you.
            </p>
            <div className="space-y-4 mb-8">
              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <h3 className="font-semibold mb-2">What you get with Booking Links:</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-[#4FB3B3] mt-1">✓</span>
                    <span>Create unlimited booking links</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#4FB3B3] mt-1">✓</span>
                    <span>Set availability rules and blackout dates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#4FB3B3] mt-1">✓</span>
                    <span>Let anyone book time without a DayPilot account</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#4FB3B3] mt-1">✓</span>
                    <span>Automatic event creation when bookings are made</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => navigate('/app/billing')}
                className="bg-[#4FB3B3] hover:bg-[#3A8F8F]"
              >
                View Plans & Upgrade
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/app/share-links')}
              >
                Use Share Links Instead
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
