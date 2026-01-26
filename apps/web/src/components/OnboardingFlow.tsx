import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, Label } from '@daypilot/ui';
import {
  useCreateOrganization,
  useCreateLocation,
  useOrganizations,
} from '@daypilot/lib';

type OnboardingChoice = 'personal' | 'team' | 'franchise' | null;

export function OnboardingFlow() {
  const [choice, setChoice] = useState<OnboardingChoice>(null);
  const [orgName, setOrgName] = useState('');
  const [locationName, setLocationName] = useState('');
  const navigate = useNavigate();

  const { data: organizations } = useOrganizations();
  const createOrg = useCreateOrganization();
  const createLocation = useCreateLocation();

  const handleSubmit = async () => {
    if (choice === 'personal') {
      // Just personal use, skip organization creation
      navigate('/app');
      return;
    }

    if (!orgName.trim()) {
      alert('Please enter an organization name');
      return;
    }

    try {
      const org = await createOrg.mutateAsync({ name: orgName });

      if (choice === 'franchise' && locationName.trim()) {
        // Create first location for franchise
        await createLocation.mutateAsync({
          organization_id: org.id,
          name: locationName,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      }

      navigate('/app');
    } catch (error: any) {
      alert('Failed to create organization: ' + error.message);
    }
  };

  if (organizations && organizations.length > 0) {
    // User already has organizations, skip onboarding
    return null;
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          'linear-gradient(180deg, #F5E6D3 0%, #EFEBE2 50%, #F5E6D3 100%)',
      }}
    >
      <Card className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-[#2B3448]">
            Welcome to DayPilot
          </h1>
          <p className="text-[#4f4f4f] text-base mb-2">
            You already have your own personal calendar! 🎉
          </p>
          <p className="text-sm text-[#4f4f4f]">
            Would you like to also set up a team or franchise? (Optional)
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => setChoice('personal')}
            className={`p-6 rounded-lg border-2 transition-all text-center ${
              choice === 'personal'
                ? 'border-[#4FB3B3] bg-gradient-to-br from-[#EFBF4D]/10 to-[#4FB3B3]/10'
                : 'border-gray-200 hover:border-[#4FB3B3]/50'
            }`}
          >
            <div className="text-4xl mb-2">👤</div>
            <h3 className="font-semibold text-[#2B3448] mb-1">Just me</h3>
            <p className="text-sm text-[#4f4f4f]">
              Use your personal calendar only
            </p>
          </button>

          <button
            onClick={() => setChoice('team')}
            className={`p-6 rounded-lg border-2 transition-all text-center ${
              choice === 'team'
                ? 'border-[#4FB3B3] bg-gradient-to-br from-[#EFBF4D]/10 to-[#4FB3B3]/10'
                : 'border-gray-200 hover:border-[#4FB3B3]/50'
            }`}
          >
            <div className="text-4xl mb-2">👥</div>
            <h3 className="font-semibold text-[#2B3448] mb-1">My team</h3>
            <p className="text-sm text-[#4f4f4f]">
              Create a team workspace (you keep your personal calendar)
            </p>
          </button>

          <button
            onClick={() => setChoice('franchise')}
            className={`p-6 rounded-lg border-2 transition-all text-center ${
              choice === 'franchise'
                ? 'border-[#4FB3B3] bg-gradient-to-br from-[#EFBF4D]/10 to-[#4FB3B3]/10'
                : 'border-gray-200 hover:border-[#4FB3B3]/50'
            }`}
          >
            <div className="text-4xl mb-2">🏢</div>
            <h3 className="font-semibold text-[#2B3448] mb-1">Franchise</h3>
            <p className="text-sm text-[#4f4f4f]">
              Manage multiple locations (you keep your personal calendar)
            </p>
          </button>
        </div>

        {choice && choice !== 'personal' && (
          <div className="space-y-4 mb-6">
            <div>
              <Label htmlFor="orgName">Organization Name</Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder="e.g., Acme Corp"
                required
              />
            </div>

            {choice === 'franchise' && (
              <div>
                <Label htmlFor="locationName">
                  First Location Name (optional)
                </Label>
                <Input
                  id="locationName"
                  value={locationName}
                  onChange={e => setLocationName(e.target.value)}
                  placeholder="e.g., Downtown Office"
                />
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate('/app')}>
            Skip for now
          </Button>
          {choice && (
            <Button
              onClick={handleSubmit}
              disabled={
                createOrg.isPending ||
                (choice !== 'personal' && !orgName.trim())
              }
            >
              {createOrg.isPending ? 'Creating...' : 'Continue'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
