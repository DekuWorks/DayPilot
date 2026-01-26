import { useState } from 'react';
import { Card, Button, Input, Label } from '@daypilot/ui';
import {
  useShareLinks,
  useCreateShareLink,
  useUpdateShareLink,
  useRevokeShareLink,
} from '@daypilot/lib';
import type { ShareMode } from '@daypilot/types';

export function ShareLinksPage() {
  const { data: shareLinks = [], isLoading, error: shareLinksError } = useShareLinks();
  const createShareLink = useCreateShareLink();
  const updateShareLink = useUpdateShareLink();
  const revokeShareLink = useRevokeShareLink();
  
  const [copied, setCopied] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  const activeLink = shareLinks.find(link => !link.revokedAt);
  const isEnabled = !!activeLink;
  const isCreating = createShareLink.isPending || toggleLoading;

  const handleToggle = async (enabled: boolean) => {
    setToggleLoading(true);
    try {
      if (enabled) {
        await createShareLink.mutateAsync({ mode: 'busyOnly' });
      } else {
        if (activeLink) {
          setRevokingId(activeLink.id);
          setShowRevokeConfirm(true);
        }
      }
    } catch (error: any) {
      alert('Error: ' + (error.message || 'Failed to update share link'));
      console.error('Share link toggle error:', error);
    } finally {
      setToggleLoading(false);
    }
  };

  const handleModeChange = async (mode: ShareMode) => {
    try {
      if (activeLink) {
        await updateShareLink.mutateAsync({ id: activeLink.id, mode });
      } else {
        await createShareLink.mutateAsync({ mode });
      }
    } catch (error: any) {
      alert('Error: ' + (error.message || 'Failed to update privacy mode'));
      console.error('Share link mode change error:', error);
    }
  };

  const handleRevoke = async () => {
    if (revokingId) {
      await revokeShareLink.mutateAsync(revokingId);
      setShowRevokeConfirm(false);
      setRevokingId(null);
    }
  };

  const handleCopyLink = () => {
    if (activeLink) {
      const shareUrl = `${window.location.origin}/share/${activeLink.token}`;
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Share Links</h1>
        <Card>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </Card>
      </div>
    );
  }

  if (shareLinksError) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Share Links</h1>
        <Card>
          <div className="p-6">
            <p className="text-red-600 font-semibold mb-2">Error loading share links</p>
            <p className="text-red-500 text-sm">
              {shareLinksError instanceof Error 
                ? shareLinksError.message 
                : 'Failed to load share links. Please refresh the page.'}
            </p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline" 
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Share Links</h1>
          <p className="text-gray-600">
            Share your calendar with other DayPilot users to coordinate schedules
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Share Link Management */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">Your Share Link</h2>
          
          <div className="space-y-4">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-[#2B3448]">Share Link Status</p>
                <p className="text-sm text-gray-600">
                  {isEnabled ? 'Active - Others can view your calendar' : 'Inactive - Link is disabled'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => handleToggle(e.target.checked)}
                  disabled={isCreating}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#4FB3B3]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4FB3B3] ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {isCreating && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Share Link URL */}
            {isEnabled && activeLink && (
              <div>
                <Label htmlFor="share-url">Share Link</Label>
                <div className="flex gap-2">
                  <Input
                    id="share-url"
                    value={`${window.location.origin}/share/${activeLink.token}`}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    onClick={handleCopyLink}
                    variant="outline"
                    className="whitespace-nowrap"
                  >
                    {copied ? '✓ Copied' : 'Copy'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Send this link to other DayPilot users to let them view your calendar
                </p>
              </div>
            )}

            {/* Privacy Mode */}
            {isEnabled && activeLink && (
              <div>
                <Label>Privacy Mode</Label>
                <div className="space-y-2 mt-2">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="mode"
                      value="busyOnly"
                      checked={activeLink.mode === 'busyOnly'}
                      onChange={() => handleModeChange('busyOnly')}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Busy Only</p>
                      <p className="text-xs text-gray-500">
                        Shows only "Busy" blocks, hides event details
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="mode"
                      value="readOnly"
                      checked={activeLink.mode === 'readOnly'}
                      onChange={() => handleModeChange('readOnly')}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Read Only</p>
                      <p className="text-xs text-gray-500">
                        Shows full event details (title, time, description)
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Revoke Button */}
            {isEnabled && activeLink && (
              <Button
                variant="outline"
                onClick={() => {
                  setRevokingId(activeLink.id);
                  setShowRevokeConfirm(true);
                }}
                className="w-full text-red-600 hover:text-red-700 hover:border-red-300"
              >
                Revoke Share Link
              </Button>
            )}
          </div>
        </Card>

        {/* Instructions */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">How It Works</h2>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4FB3B3] text-white flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <p className="font-medium mb-1">Create Your Share Link</p>
                <p className="text-sm text-gray-600">
                  Toggle on to generate a unique link to your calendar
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4FB3B3] text-white flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <p className="font-medium mb-1">Share with DayPilot Users</p>
                <p className="text-sm text-gray-600">
                  Send the link to other DayPilot users who want to coordinate with you
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4FB3B3] text-white flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <p className="font-medium mb-1">They View Your Calendar</p>
                <p className="text-sm text-gray-600">
                  Recipients can see your availability and coordinate meetings accordingly
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> Share links are for DayPilot users. For public booking links (where anyone can book time with you), upgrade to a premium plan.
            </p>
          </div>
        </Card>
      </div>

      {/* Revoke Confirmation Modal */}
      {showRevokeConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-2">Revoke Share Link?</h3>
            <p className="text-gray-600 mb-6">
              This will immediately disable the share link. Anyone with the link will no longer be able to view your calendar.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={handleRevoke}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Revoke
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRevokeConfirm(false);
                  setRevokingId(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
