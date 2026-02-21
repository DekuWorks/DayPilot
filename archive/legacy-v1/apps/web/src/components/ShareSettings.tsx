import { useState } from 'react';
import { Card, Button, Input, Label } from '@daypilot/ui';
import {
  useShareLinks,
  useCreateShareLink,
  useUpdateShareLink,
  useRevokeShareLink,
} from '@daypilot/lib';
import type { ShareMode } from '@daypilot/types';

export function ShareSettings() {
  const { data: shareLinks = [], isLoading } = useShareLinks();
  const createShareLink = useCreateShareLink();
  const updateShareLink = useUpdateShareLink();
  const revokeShareLink = useRevokeShareLink();

  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const activeLink = shareLinks[0]; // User can only have one active link
  const isEnabled = !!activeLink;

  const handleToggle = async (enabled: boolean) => {
    if (enabled) {
      // Create share link with default mode
      await createShareLink.mutateAsync({ mode: 'busyOnly' });
    } else {
      // Revoke current link
      if (activeLink) {
        setRevokingId(activeLink.id);
        setShowRevokeConfirm(true);
      }
    }
  };

  const handleModeChange = async (mode: ShareMode) => {
    if (activeLink) {
      await updateShareLink.mutateAsync({ id: activeLink.id, mode });
    } else {
      await createShareLink.mutateAsync({ mode });
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
      <Card className="sidebar-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="sidebar-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--text)]">
            Calendar Sharing
          </h3>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={e => handleToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#4FB3B3]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4FB3B3]"></div>
          </label>
        </div>

        {isEnabled && activeLink ? (
          <div className="space-y-4">
            {/* Mode Selection */}
            <div>
              <Label className="text-sm font-semibold text-[var(--text)] mb-2 block">
                Privacy Mode
              </Label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleModeChange('busyOnly')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeLink.mode === 'busyOnly'
                      ? 'bg-[var(--text)] text-white shadow-sm'
                      : 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border)]'
                  }`}
                >
                  Busy Only
                </button>
                <button
                  onClick={() => handleModeChange('readOnly')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeLink.mode === 'readOnly'
                      ? 'bg-[var(--text)] text-white shadow-sm'
                      : 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border)]'
                  }`}
                >
                  Read Only
                </button>
              </div>
              <p className="text-xs text-[var(--muted)] mt-2">
                {activeLink.mode === 'busyOnly'
                  ? 'Only show busy/free blocks, hide event details'
                  : 'Show all event details (read-only)'}
              </p>
            </div>

            {/* Share Link */}
            <div>
              <Label className="text-sm font-semibold text-[var(--text)] mb-2 block">
                Share Link
              </Label>
              <div className="flex gap-2">
                <Input
                  value={`${window.location.origin}/share/${activeLink.token}`}
                  readOnly
                  className="flex-1 font-mono text-xs"
                />
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  size="sm"
                  className="!px-4"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            {/* Revoke Button */}
            <Button
              variant="outline"
              onClick={() => {
                setRevokingId(activeLink.id);
                setShowRevokeConfirm(true);
              }}
              className="w-full !text-red-600 !border-red-600 hover:!bg-red-50"
            >
              Revoke Link
            </Button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-[var(--muted)] mb-4">
              Enable sharing to create a public link to your calendar
            </p>
          </div>
        )}
      </Card>

      {/* Revoke Confirmation Modal */}
      {showRevokeConfirm && (
        <div
          className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4"
          onClick={() => setShowRevokeConfirm(false)}
        >
          <div
            className="modal-card w-full max-w-md p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[var(--text)] mb-4">
              Revoke Share Link?
            </h3>
            <p className="text-sm text-[var(--muted)] mb-6">
              This will immediately disable the share link. Anyone with the link
              will no longer be able to view your calendar.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={handleRevoke}
                className="flex-1 !bg-red-600 !text-white hover:!bg-red-700"
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
          </div>
        </div>
      )}
    </>
  );
}
