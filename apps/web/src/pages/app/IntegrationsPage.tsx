import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Button, Badge } from '@daypilot/ui';
import { useQueryClient } from '@tanstack/react-query';
import {
  useConnectedAccounts,
  useCalendarMappings,
  useConnectGoogle,
  useDisconnectAccount,
  useSyncCalendar,
  useDiscoverCalendars,
  useEntitlements,
  canSyncCalendars,
  isSupabaseConfigured,
} from '@daypilot/lib';
// Helper function to format relative time
function formatDistanceToNow(
  date: Date,
  options?: { addSuffix?: boolean }
): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (Math.abs(diffMins) < 1) return 'just now';
  if (Math.abs(diffMins) < 60) {
    return options?.addSuffix
      ? `${Math.abs(diffMins)} minute${Math.abs(diffMins) !== 1 ? 's' : ''} ago`
      : `in ${Math.abs(diffMins)} minute${Math.abs(diffMins) !== 1 ? 's' : ''}`;
  }
  if (Math.abs(diffHours) < 24) {
    return options?.addSuffix
      ? `${Math.abs(diffHours)} hour${Math.abs(diffHours) !== 1 ? 's' : ''} ago`
      : `in ${Math.abs(diffHours)} hour${Math.abs(diffHours) !== 1 ? 's' : ''}`;
  }
  return options?.addSuffix
    ? `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`
    : `in ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
}

export function IntegrationsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: connectedAccounts = [], isLoading: accountsLoading } =
    useConnectedAccounts();
  const { data: calendarMappings = [], isLoading: mappingsLoading } =
    useCalendarMappings();
  const { data: entitlements } = useEntitlements();
  const connectGoogle = useConnectGoogle();
  const disconnectAccount = useDisconnectAccount();
  const discoverCalendars = useDiscoverCalendars();
  const syncCalendar = useSyncCalendar();

  const [syncingCalendarId, setSyncingCalendarId] = useState<string | null>(
    null
  );
  const [discoveringAccountId, setDiscoveringAccountId] = useState<
    string | null
  >(null);

  const googleAccount = connectedAccounts.find(
    acc => acc.provider === 'google'
  );
  const canConnectMore = canSyncCalendars(
    entitlements,
    connectedAccounts.length
  );

  // Handle OAuth callback and refresh data
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'connected') {
      // Show success message first
      alert('Google Calendar connected successfully!');

      // Invalidate and refetch queries to refresh connected accounts
      queryClient.invalidateQueries({ queryKey: ['connected_accounts'] });
      queryClient.invalidateQueries({ queryKey: ['google_account_status'] });

      // Force a refetch
      queryClient.refetchQueries({ queryKey: ['connected_accounts'] });

      // Clear the success param
      setSearchParams({});
    } else if (error) {
      // Show error message
      alert(`Connection failed: ${error}`);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, queryClient]);

  // Auto-discover calendars when Google account is connected (but not already discovering)
  useEffect(() => {
    if (
      googleAccount &&
      calendarMappings.length === 0 &&
      !discoveringAccountId &&
      !accountsLoading
    ) {
      // Small delay to ensure data is fully loaded
      const timer = setTimeout(() => {
        handleDiscoverCalendars(googleAccount.id);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [
    googleAccount?.id,
    calendarMappings.length,
    discoveringAccountId,
    accountsLoading,
  ]);

  const handleConnectGoogle = () => {
    connectGoogle.mutate();
  };

  const handleDisconnect = async (accountId: string) => {
    if (
      confirm(
        'Are you sure you want to disconnect this account? This will stop syncing all calendars.'
      )
    ) {
      await disconnectAccount.mutateAsync(accountId);
    }
  };

  const handleDiscoverCalendars = async (accountId: string) => {
    setDiscoveringAccountId(accountId);
    try {
      const result = await discoverCalendars.mutateAsync(accountId);
      alert(
        `Discovered ${result.mappingsCreated} calendar${result.mappingsCreated !== 1 ? 's' : ''}!`
      );
    } catch (error: any) {
      alert('Failed to discover calendars: ' + error.message);
    } finally {
      setDiscoveringAccountId(null);
    }
  };

  const handleSync = async (mappingId: string) => {
    setSyncingCalendarId(mappingId);
    try {
      await syncCalendar.mutateAsync(mappingId);
      alert('Calendar synced successfully!');
    } catch (error: any) {
      alert('Sync failed: ' + error.message);
    } finally {
      setSyncingCalendarId(null);
    }
  };

  if (accountsLoading || mappingsLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Integrations</h1>
        <Card>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Integrations</h1>

      {!isSupabaseConfigured() && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm font-medium text-amber-900">
            Supabase is not configured for this build.
          </p>
          <p className="text-sm text-amber-800 mt-1">
            Add{' '}
            <code className="bg-amber-100 px-1 rounded">VITE_SUPABASE_URL</code>{' '}
            and{' '}
            <code className="bg-amber-100 px-1 rounded">
              VITE_SUPABASE_ANON_KEY
            </code>{' '}
            in your repo’s{' '}
            <strong>Settings → Secrets and variables → Actions</strong>, then
            redeploy so Google Calendar discovery and other features work.
          </p>
        </div>
      )}

      {/* Google Calendar */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#2B3448]">
                Google Calendar
              </h2>
              <p className="text-sm text-gray-600">
                Sync your Google Calendar events
              </p>
            </div>
          </div>
          {!googleAccount ? (
            <Button
              onClick={handleConnectGoogle}
              disabled={connectGoogle.isPending || !canConnectMore}
              variant="primary"
            >
              {connectGoogle.isPending
                ? 'Connecting...'
                : 'Connect Google Calendar'}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="success">Connected</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDisconnect(googleAccount.id)}
                disabled={disconnectAccount.isPending}
              >
                Disconnect
              </Button>
            </div>
          )}
        </div>

        {!canConnectMore && !googleAccount && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              You've reached your calendar connection limit. Upgrade your plan
              to connect more calendars.
            </p>
          </div>
        )}

        {googleAccount && (
          <div className="mt-4 space-y-3">
            <div className="text-sm text-gray-600">
              <p>
                Connected as:{' '}
                <span className="font-medium">{googleAccount.email}</span>
              </p>
              {googleAccount.token_expires_at && (
                <p className="text-xs text-gray-500 mt-1">
                  Token expires:{' '}
                  {formatDistanceToNow(
                    new Date(googleAccount.token_expires_at),
                    { addSuffix: true }
                  )}
                </p>
              )}
            </div>

            {/* Discover Calendars Button */}
            {calendarMappings.filter(m => {
              return connectedAccounts.some(
                acc => acc.id === m.connected_account_id
              );
            }).length === 0 && (
              <div className="mt-3">
                <Button
                  variant="outline"
                  onClick={() => handleDiscoverCalendars(googleAccount.id)}
                  disabled={
                    discoveringAccountId === googleAccount.id ||
                    discoverCalendars.isPending
                  }
                >
                  {discoveringAccountId === googleAccount.id
                    ? 'Discovering...'
                    : 'Discover Calendars'}
                </Button>
              </div>
            )}

            {/* Calendar Mappings */}
            {calendarMappings.filter(m => {
              // Filter mappings for this account
              return connectedAccounts.some(
                acc => acc.id === m.connected_account_id
              );
            }).length > 0 ? (
              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold mb-3 text-[#2B3448]">
                  Synced Calendars
                </h3>
                <div className="space-y-2">
                  {calendarMappings
                    .filter(m => {
                      return connectedAccounts.some(
                        acc => acc.id === m.connected_account_id
                      );
                    })
                    .map(mapping => (
                      <div
                        key={mapping.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {mapping.provider_calendar_name ||
                              'Untitled Calendar'}
                          </p>
                          {mapping.last_synced_at && (
                            <p className="text-xs text-gray-500 mt-1">
                              Last synced:{' '}
                              {formatDistanceToNow(
                                new Date(mapping.last_synced_at),
                                { addSuffix: true }
                              )}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              mapping.sync_enabled ? 'success' : 'default'
                            }
                          >
                            {mapping.sync_enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSync(mapping.id)}
                            disabled={
                              syncingCalendarId === mapping.id ||
                              syncCalendar.isPending
                            }
                          >
                            {syncingCalendarId === mapping.id
                              ? 'Syncing...'
                              : 'Sync Now'}
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  No calendars synced yet. After connecting, your calendars will
                  appear here.
                </p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Coming Soon */}
      <Card>
        <h2 className="text-xl font-semibold mb-2 text-[#2B3448]">
          Coming Soon
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 opacity-50">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200">
              <span className="text-xl">📅</span>
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Microsoft Outlook</h3>
              <p className="text-sm text-gray-600">
                Sync with Outlook Calendar
              </p>
            </div>
            <Button variant="outline" disabled>
              Coming Soon
            </Button>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 opacity-50">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200">
              <span className="text-xl">🍎</span>
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Apple iCloud</h3>
              <p className="text-sm text-gray-600">Sync with iCloud Calendar</p>
            </div>
            <Button variant="outline" disabled>
              Coming Soon
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
