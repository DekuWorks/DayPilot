/**
 * Migration utility to move data from localStorage to Supabase
 * Run once per user to migrate their data
 */

import {
  getEvents as getLocalEvents,
  getTasks as getLocalTasks,
  getCategories as getLocalCategories,
  getAttendees as getLocalAttendees,
  getShareLinks as getLocalShareLinks,
  getUserPreferences as getLocalPreferences,
} from '../storage/localStorage';
import {
  saveEvents,
  saveTasks,
  saveCategories,
  saveAttendees,
  saveShareLinks,
  saveUserPreferences,
} from '../storage/storageAdapter';
import { supabaseClient } from '../supabaseClient';

const MIGRATION_KEY = 'daypilot-migration-complete';

/**
 * Check if migration has been completed
 */
export function isMigrationComplete(): boolean {
  try {
    return localStorage.getItem(MIGRATION_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark migration as complete
 */
function markMigrationComplete(): void {
  try {
    localStorage.setItem(MIGRATION_KEY, 'true');
  } catch (err) {
    console.error('Failed to mark migration complete:', err);
  }
}

/**
 * Migrate all data from localStorage to Supabase
 */
export async function migrateLocalToSupabase(): Promise<{
  success: boolean;
  migrated: {
    events: number;
    tasks: number;
    categories: number;
    attendees: number;
    shareLinks: number;
  };
  errors: string[];
}> {
  const errors: string[] = [];
  const migrated = {
    events: 0,
    tasks: 0,
    categories: 0,
    attendees: 0,
    shareLinks: 0,
  };

  try {
    // Check if user is authenticated
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to migrate data');
    }

    // Migrate events
    try {
      const localEvents = getLocalEvents();
      if (localEvents.length > 0) {
        await saveEvents(localEvents);
        migrated.events = localEvents.length;
      }
    } catch (err: any) {
      errors.push(`Events: ${err.message}`);
    }

    // Migrate tasks
    try {
      const localTasks = getLocalTasks();
      if (localTasks.length > 0) {
        await saveTasks(localTasks);
        migrated.tasks = localTasks.length;
      }
    } catch (err: any) {
      errors.push(`Tasks: ${err.message}`);
    }

    // Migrate categories
    try {
      const localCategories = getLocalCategories();
      if (localCategories.length > 0) {
        await saveCategories(localCategories);
        migrated.categories = localCategories.length;
      }
    } catch (err: any) {
      errors.push(`Categories: ${err.message}`);
    }

    // Migrate attendees
    try {
      const localAttendees = getLocalAttendees();
      if (localAttendees.length > 0) {
        await saveAttendees(localAttendees);
        migrated.attendees = localAttendees.length;
      }
    } catch (err: any) {
      errors.push(`Attendees: ${err.message}`);
    }

    // Migrate share links
    try {
      const localShareLinks = getLocalShareLinks();
      if (localShareLinks.length > 0) {
        await saveShareLinks(localShareLinks);
        migrated.shareLinks = localShareLinks.length;
      }
    } catch (err: any) {
      errors.push(`Share Links: ${err.message}`);
    }

    // Migrate preferences
    try {
      const localPrefs = getLocalPreferences() as any;
      // Transform localStorage preferences to new format
      await saveUserPreferences({
        emailRemindersEnabled: true,
        defaultReminderMinutes: 30,
        workingHours: localPrefs.workingHours || { start: 480, end: 1020 },
        timezone:
          localPrefs.timezone ||
          Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    } catch (err: any) {
      errors.push(`Preferences: ${err.message}`);
    }

    // Mark migration as complete if no critical errors
    if (errors.length === 0) {
      markMigrationComplete();
    }

    return {
      success: errors.length === 0,
      migrated,
      errors,
    };
  } catch (err: any) {
    return {
      success: false,
      migrated,
      errors: [...errors, `Migration failed: ${err.message}`],
    };
  }
}
