import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, Input, Label, Badge } from '@daypilot/ui';
import {
  useOrganizations,
  useOrganizationMembers,
  useLocations,
  useUpdateOrganization,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
  useUpdateOrganizationMember,
  useRemoveOrganizationMember,
} from '@daypilot/lib';
import type { OrganizationMemberRole } from '@daypilot/types';

export function OrganizationPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { data: organizations } = useOrganizations();
  const organization = organizations?.find((org) => org.id === orgId);

  const { data: members } = useOrganizationMembers(orgId || null);
  const { data: locations } = useLocations(orgId || null);

  const updateOrg = useUpdateOrganization();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();
  const updateMember = useUpdateOrganizationMember();
  const removeMember = useRemoveOrganizationMember();

  const [orgName, setOrgName] = useState(organization?.name || '');
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<string | null>(null);
  const [locationForm, setLocationForm] = useState({
    name: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
  });

  if (!organization) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <p className="text-center text-[#4f4f4f]">Organization not found</p>
        </Card>
      </div>
    );
  }

  const handleUpdateOrg = async () => {
    if (!orgId) return;
    try {
      await updateOrg.mutateAsync({ id: orgId, updates: { name: orgName } });
      alert('Organization updated successfully');
    } catch (error: any) {
      alert('Failed to update organization: ' + error.message);
    }
  };

  const handleCreateLocation = async () => {
    if (!orgId) return;
    try {
      await createLocation.mutateAsync({
        organization_id: orgId,
        ...locationForm,
      });
      setLocationForm({
        name: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        address: '',
        city: '',
        state: '',
        country: '',
        postal_code: '',
      });
      setShowLocationForm(false);
    } catch (error: any) {
      alert('Failed to create location: ' + error.message);
    }
  };

  const handleUpdateLocation = async (locationId: string) => {
    if (!orgId) return;
    try {
      await updateLocation.mutateAsync({
        id: locationId,
        updates: locationForm,
        organizationId: orgId,
      });
      setEditingLocation(null);
      setLocationForm({
        name: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        address: '',
        city: '',
        state: '',
        country: '',
        postal_code: '',
      });
    } catch (error: any) {
      alert('Failed to update location: ' + error.message);
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!orgId || !confirm('Are you sure you want to delete this location?'))
      return;
    try {
      await deleteLocation.mutateAsync({ id: locationId, organizationId: orgId });
    } catch (error: any) {
      alert('Failed to delete location: ' + error.message);
    }
  };

  const handleUpdateMemberRole = async (
    memberId: string,
    role: OrganizationMemberRole
  ) => {
    if (!orgId) return;
    try {
      await updateMember.mutateAsync({
        id: memberId,
        role,
        organizationId: orgId,
      });
    } catch (error: any) {
      alert('Failed to update member role: ' + error.message);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!orgId || !confirm('Are you sure you want to remove this member?'))
      return;
    try {
      await removeMember.mutateAsync({ id: memberId, organizationId: orgId });
    } catch (error: any) {
      alert('Failed to remove member: ' + error.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#2B3448] mb-2">
          {organization.name}
        </h1>
        <Badge variant="success">{organization.plan}</Badge>
      </div>

      {/* Organization Settings */}
      <Card>
        <h2 className="text-xl font-semibold mb-4 text-[#2B3448]">
          Organization Settings
        </h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="orgName">Organization Name</Label>
            <Input
              id="orgName"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </div>
          <div>
            <p className="text-sm text-[#4f4f4f] mb-2">
              <strong>Slug:</strong> {organization.slug}
            </p>
            <p className="text-sm text-[#4f4f4f]">
              <strong>Plan:</strong> {organization.plan}
            </p>
          </div>
          <Button onClick={handleUpdateOrg} disabled={updateOrg.isPending}>
            {updateOrg.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Card>

      {/* Members */}
      <Card>
        <h2 className="text-xl font-semibold mb-4 text-[#2B3448]">Members</h2>
        <div className="space-y-3">
          {members?.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
            >
              <div>
                <p className="font-medium text-[#2B3448]">
                  {member.profiles?.name || member.profiles?.email}
                </p>
                <p className="text-sm text-[#4f4f4f]">{member.profiles?.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={member.role}
                  onChange={(e) =>
                    handleUpdateMemberRole(
                      member.id,
                      e.target.value as OrganizationMemberRole
                    )
                  }
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="viewer">Viewer</option>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveMember(member.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Locations */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[#2B3448]">Locations</h2>
          <Button
            size="sm"
            onClick={() => {
              setShowLocationForm(true);
              setEditingLocation(null);
              setLocationForm({
                name: '',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                address: '',
                city: '',
                state: '',
                country: '',
                postal_code: '',
              });
            }}
          >
            Add Location
          </Button>
        </div>

        {showLocationForm && (
          <Card className="mb-4 bg-gray-50">
            <h3 className="font-semibold mb-4 text-[#2B3448]">
              {editingLocation ? 'Edit Location' : 'New Location'}
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="locName">Name *</Label>
                <Input
                  id="locName"
                  value={locationForm.name}
                  onChange={(e) =>
                    setLocationForm({ ...locationForm, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="locTimezone">Timezone</Label>
                <Input
                  id="locTimezone"
                  value={locationForm.timezone}
                  onChange={(e) =>
                    setLocationForm({
                      ...locationForm,
                      timezone: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="locAddress">Address</Label>
                <Input
                  id="locAddress"
                  value={locationForm.address}
                  onChange={(e) =>
                    setLocationForm({
                      ...locationForm,
                      address: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="locCity">City</Label>
                <Input
                  id="locCity"
                  value={locationForm.city}
                  onChange={(e) =>
                    setLocationForm({ ...locationForm, city: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="locState">State</Label>
                <Input
                  id="locState"
                  value={locationForm.state}
                  onChange={(e) =>
                    setLocationForm({ ...locationForm, state: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="locCountry">Country</Label>
                <Input
                  id="locCountry"
                  value={locationForm.country}
                  onChange={(e) =>
                    setLocationForm({
                      ...locationForm,
                      country: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button
                onClick={() => {
                  if (editingLocation) {
                    handleUpdateLocation(editingLocation);
                  } else {
                    handleCreateLocation();
                  }
                }}
                disabled={
                  !locationForm.name.trim() ||
                  createLocation.isPending ||
                  updateLocation.isPending
                }
              >
                {editingLocation ? 'Update' : 'Create'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowLocationForm(false);
                  setEditingLocation(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        <div className="space-y-3">
          {locations?.map((location) => (
            <div
              key={location.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
            >
              <div>
                <p className="font-medium text-[#2B3448]">{location.name}</p>
                <p className="text-sm text-[#4f4f4f]">
                  {location.timezone}
                  {location.city && ` • ${location.city}`}
                  {location.state && `, ${location.state}`}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingLocation(location.id);
                    setShowLocationForm(true);
                    setLocationForm({
                      name: location.name,
                      timezone: location.timezone,
                      address: location.address || '',
                      city: location.city || '',
                      state: location.state || '',
                      country: location.country || '',
                      postal_code: location.postal_code || '',
                    });
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteLocation(location.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
          {locations?.length === 0 && (
            <p className="text-center text-[#4f4f4f] py-8">
              No locations yet. Add your first location to get started.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}





