import { useState } from 'react';
import { Card, Button, Badge } from '@daypilot/ui';
import { useEntitlements, canUseAI, syncFrequency } from '@daypilot/lib';
import { supabaseClient } from '@daypilot/lib';

const PRICE_IDS = {
  student: import.meta.env.VITE_STRIPE_PRICE_ID_STUDENT || 'price_student',
  team: import.meta.env.VITE_STRIPE_PRICE_ID_TEAM || 'price_team',
  enterprise:
    import.meta.env.VITE_STRIPE_PRICE_ID_ENTERPRISE || 'price_enterprise',
};

export function BillingPage() {
  const { data: entitlements, isLoading } = useEntitlements();
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (tier: 'student' | 'team' | 'enterprise') => {
    setLoading(tier);

    try {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();

      if (!user || !user.email) {
        alert('Please sign in to upgrade');
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        alert('Supabase not configured');
        return;
      }

      // Call backend to create checkout session
      const response = await fetch(
        `${supabaseUrl}/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${(await supabaseClient.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            priceId: PRICE_IDS[tier],
            tier,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();

      if (!user) {
        alert('Please sign in');
        return;
      }

      // Get stripe customer ID
      const { data: customer } = await supabaseClient
        .from('stripe_customers')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .single();

      if (!customer) {
        alert('No subscription found');
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/create-portal-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${(await supabaseClient.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            customerId: customer.stripe_customer_id,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Billing</h1>
        <Card>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </Card>
      </div>
    );
  }

  const currentTier = entitlements?.tier || 'free';
  const hasActiveSubscription = currentTier !== 'free';

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Billing & Subscription</h1>

      {/* Current Plan */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold mb-2 text-[#2B3448]">
              Current Plan
            </h2>
            <Badge variant={currentTier === 'free' ? 'default' : 'success'}>
              {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
            </Badge>
          </div>
          {hasActiveSubscription && (
            <Button variant="outline" onClick={handleManageSubscription}>
              Manage Subscription
            </Button>
          )}
        </div>

        {/* Current Entitlements */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">AI Features:</span>
            <span className="font-medium">
              {canUseAI(entitlements) ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">AI Credits:</span>
            <span className="font-medium">
              {entitlements?.ai_credits === -1
                ? 'Unlimited'
                : entitlements?.ai_credits || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Max Calendars:</span>
            <span className="font-medium">
              {entitlements?.max_connected_calendars || 1}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Sync Frequency:</span>
            <span className="font-medium">
              Every {syncFrequency(entitlements)} minutes
            </span>
          </div>
        </div>
      </Card>

      {/* Pricing Tiers */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Student */}
        <Card className="text-center">
          <h3 className="text-2xl font-bold mb-2 text-[#2B3448]">Student</h3>
          <p className="text-4xl font-bold mb-4 text-[#4FB3B3]">
            $5<span className="text-lg">/mo</span>
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Perfect for college students
          </p>
          <ul className="space-y-2 text-sm text-gray-600 mb-6 text-left">
            <li>✓ 20 AI credits/month</li>
            <li>✓ 2 connected calendars</li>
            <li>✓ 60 min sync frequency</li>
            <li>✗ AI scheduling disabled</li>
          </ul>
          <Button
            onClick={() => handleUpgrade('student')}
            disabled={loading === 'student' || currentTier === 'student'}
            variant={currentTier === 'student' ? 'outline' : 'primary'}
            className="w-full"
          >
            {loading === 'student'
              ? 'Loading...'
              : currentTier === 'student'
                ? 'Current Plan'
                : 'Upgrade'}
          </Button>
        </Card>

        {/* Team */}
        <Card className="text-center border-2 border-[#4FB3B3]">
          <div className="mb-2">
            <Badge variant="success" className="mb-2">
              Popular
            </Badge>
          </div>
          <h3 className="text-2xl font-bold mb-2 text-[#2B3448]">Team</h3>
          <p className="text-4xl font-bold mb-4 text-[#4FB3B3]">
            $19<span className="text-lg">/mo</span>
          </p>
          <p className="text-sm text-gray-500 mb-4">
            For small teams & franchises
          </p>
          <ul className="space-y-2 text-sm text-gray-600 mb-6 text-left">
            <li>✓ AI scheduling enabled</li>
            <li>✓ 200 AI credits/month</li>
            <li>✓ 5 connected calendars</li>
            <li>✓ 30 min sync frequency</li>
          </ul>
          <Button
            onClick={() => handleUpgrade('team')}
            disabled={loading === 'team' || currentTier === 'team'}
            variant={currentTier === 'team' ? 'outline' : 'primary'}
            className="w-full"
          >
            {loading === 'team'
              ? 'Loading...'
              : currentTier === 'team'
                ? 'Current Plan'
                : 'Upgrade'}
          </Button>
        </Card>

        {/* Enterprise */}
        <Card className="text-center">
          <h3 className="text-2xl font-bold mb-2 text-[#2B3448]">Enterprise</h3>
          <p className="text-4xl font-bold mb-4 text-[#4FB3B3]">
            $79<span className="text-lg">/mo</span>
          </p>
          <p className="text-sm text-gray-500 mb-4">For large companies</p>
          <ul className="space-y-2 text-sm text-gray-600 mb-6 text-left">
            <li>✓ AI scheduling enabled</li>
            <li>✓ Unlimited AI credits</li>
            <li>✓ 50 connected calendars</li>
            <li>✓ 15 min sync frequency</li>
          </ul>
          <Button
            onClick={() => handleUpgrade('enterprise')}
            disabled={loading === 'enterprise' || currentTier === 'enterprise'}
            variant={currentTier === 'enterprise' ? 'outline' : 'primary'}
            className="w-full"
          >
            {loading === 'enterprise'
              ? 'Loading...'
              : currentTier === 'enterprise'
                ? 'Current Plan'
                : 'Upgrade'}
          </Button>
        </Card>
      </div>
    </div>
  );
}
