import { useState, useEffect } from 'react';
import { Card, Button } from '@daypilot/ui';
import {
  isMigrationComplete,
  migrateLocalToSupabase,
  isUsingSupabaseStorage,
} from '@daypilot/lib';

export function MigrationBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{
    success: boolean;
    migrated: any;
    errors: string[];
  } | null>(null);

  useEffect(() => {
    // Only show if Supabase storage is enabled and migration not complete
    const usingSupabase = isUsingSupabaseStorage();
    const completed = isMigrationComplete();

    if (usingSupabase && !completed) {
      setShowBanner(true);
    }
  }, []);

  const handleMigrate = async () => {
    setIsMigrating(true);
    try {
      const result = await migrateLocalToSupabase();
      setMigrationResult(result);
      if (result.success) {
        setShowBanner(false);
      }
    } catch (error: any) {
      setMigrationResult({
        success: false,
        migrated: {},
        errors: [error.message],
      });
    } finally {
      setIsMigrating(false);
    }
  };

  if (!showBanner) return null;

  return (
    <Card className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Migrate to Cloud Storage
          </h3>
          <p className="text-sm text-blue-800 mb-4">
            Your data is currently stored locally. Migrate to Supabase to access
            your calendar from any device.
          </p>
          {migrationResult && (
            <div
              className={`mb-4 p-3 rounded ${migrationResult.success ? 'bg-green-100' : 'bg-red-100'}`}
            >
              {migrationResult.success ? (
                <p className="text-sm text-green-800">
                  ✓ Migration complete! {migrationResult.migrated.events}{' '}
                  events, {migrationResult.migrated.tasks} tasks migrated.
                </p>
              ) : (
                <div>
                  <p className="text-sm text-red-800 font-semibold mb-1">
                    Migration had errors:
                  </p>
                  <ul className="text-sm text-red-700 list-disc list-inside">
                    {migrationResult.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Button
              onClick={handleMigrate}
              disabled={isMigrating}
              className="!bg-blue-600 !text-white"
            >
              {isMigrating ? 'Migrating...' : 'Migrate Now'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowBanner(false)}
              disabled={isMigrating}
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
