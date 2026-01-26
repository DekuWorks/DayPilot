// Supabase client
export { supabaseClient, isSupabaseConfigured } from './supabaseClient';

// Date utilities
export * from './utils/date';

// Recurrence utilities
export * from './utils/recurrence';

// Timezone utilities
export * from './utils/timezone';

// AI utilities
export * from './utils/ai';

// API hooks
export * from './hooks/useEvents';
export * from './hooks/useCalendars';
export * from './hooks/useOrganizations';
export * from './hooks/useLocations';
export * from './hooks/useBookingLinks';
export * from './hooks/useShareLinks';
export * from './hooks/useAttendees';
export * from './hooks/useEmail';
export * from './utils/email';
export * from './utils/emailTypes';
// Storage exports (uses adapter pattern - switches between localStorage and Supabase)
export {
  getEvents,
  saveEvents,
  getTasks,
  saveTasks,
  getCategories,
  saveCategories,
  getAttendees,
  saveAttendees,
  getShareLinks,
  saveShareLinks,
  getUserPreferences,
  saveUserPreferences,
  generateShareToken,
  generateInviteToken,
  isUsingSupabaseStorage,
} from './storage/storageAdapter';

// LocalStorage storage (for MVP without database)
// Note: Use storageAdapter exports instead for automatic switching
export {
  getEvents as getLocalEvents,
  saveEvents as saveLocalEvents,
  getTasks as getLocalTasks,
  saveTasks as saveLocalTasks,
  getCategories as getLocalCategories,
  saveCategories as saveLocalCategories,
  getAttendees as getLocalAttendees,
  saveAttendees as saveLocalAttendees,
  getShareLinks as getLocalShareLinks,
  saveShareLinks as saveLocalShareLinks,
  getUserPreferences as getLocalUserPreferences,
  saveUserPreferences as saveLocalUserPreferences,
} from './storage/localStorage';
export * from './utils/migrateLocalToSupabase';
export * from './hooks/useAIActions';
export * from './hooks/useEntitlements';
export * from './hooks/useConnectedAccounts';
