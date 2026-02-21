import { Link } from 'react-router-dom';
import { Card, Button, Badge } from '@daypilot/ui';
import { useOrganizations, useCreateOrganization } from '@daypilot/lib';
import { useState } from 'react';
import { Input, Label } from '@daypilot/ui';

export function OrganizationsPage() {
  const { data: organizations, isLoading } = useOrganizations();
  const createOrg = useCreateOrganization();
  const [showForm, setShowForm] = useState(false);
  const [orgName, setOrgName] = useState('');

  const handleCreate = async () => {
    if (!orgName.trim()) return;
    try {
      await createOrg.mutateAsync({ name: orgName });
      setOrgName('');
      setShowForm(false);
    } catch (error: any) {
      alert('Failed to create organization: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <p className="text-center text-[#4f4f4f]">Loading...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#2B3448]">Organizations</h1>
        <Button onClick={() => setShowForm(true)}>Create Organization</Button>
      </div>

      {showForm && (
        <Card className="bg-gray-50">
          <h2 className="text-xl font-semibold mb-4 text-[#2B3448]">
            New Organization
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newOrgName">Organization Name</Label>
              <Input
                id="newOrgName"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder="e.g., Acme Corp"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleCreate}
                disabled={!orgName.trim() || createOrg.isPending}
              >
                {createOrg.isPending ? 'Creating...' : 'Create'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {organizations?.map(org => (
          <Card key={org.id} className="hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-xl font-semibold text-[#2B3448] mb-1">
                  {org.name}
                </h3>
                <Badge variant="success">{org.plan}</Badge>
              </div>
            </div>
            <p className="text-sm text-[#4f4f4f] mb-4">Slug: {org.slug}</p>
            <Link to={`/app/organization/${org.id}`}>
              <Button variant="outline" className="w-full">
                Manage Organization
              </Button>
            </Link>
          </Card>
        ))}
      </div>

      {organizations?.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <p className="text-[#4f4f4f] mb-4">
              You don't have any organizations yet.
            </p>
            <Button onClick={() => setShowForm(true)}>
              Create Your First Organization
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
