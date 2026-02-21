/**
 * Storage adapter pattern
 * Switches between localStorage and Supabase based on feature flag
 */

const USE_SUPABASE_STORAGE =
  import.meta.env.VITE_USE_SUPABASE_STORAGE === 'true';

// Import storage implementations
import * as localStorageImpl from './localStorage';
import * as supabaseStorageImpl from './supabaseStorage';

// Re-export the appropriate implementation
export const getEvents = USE_SUPABASE_STORAGE
  ? supabaseStorageImpl.getEvents
  : localStorageImpl.getEvents;
export const saveEvents = USE_SUPABASE_STORAGE
  ? supabaseStorageImpl.saveEvents
  : localStorageImpl.saveEvents;

export const getTasks = USE_SUPABASE_STORAGE
  ? supabaseStorageImpl.getTasks
  : localStorageImpl.getTasks;
export const saveTasks = USE_SUPABASE_STORAGE
  ? supabaseStorageImpl.saveTasks
  : localStorageImpl.saveTasks;

export const getCategories = USE_SUPABASE_STORAGE
  ? supabaseStorageImpl.getCategories
  : localStorageImpl.getCategories;
export const saveCategories = USE_SUPABASE_STORAGE
  ? supabaseStorageImpl.saveCategories
  : localStorageImpl.saveCategories;

export const getAttendees = USE_SUPABASE_STORAGE
  ? supabaseStorageImpl.getAttendees
  : localStorageImpl.getAttendees;
export const saveAttendees = USE_SUPABASE_STORAGE
  ? supabaseStorageImpl.saveAttendees
  : localStorageImpl.saveAttendees;

export const getShareLinks = USE_SUPABASE_STORAGE
  ? supabaseStorageImpl.getShareLinks
  : localStorageImpl.getShareLinks;
export const saveShareLinks = USE_SUPABASE_STORAGE
  ? supabaseStorageImpl.saveShareLinks
  : localStorageImpl.saveShareLinks;

export const getUserPreferences = USE_SUPABASE_STORAGE
  ? supabaseStorageImpl.getUserPreferences
  : localStorageImpl.getUserPreferences;
export const saveUserPreferences = USE_SUPABASE_STORAGE
  ? supabaseStorageImpl.saveUserPreferences
  : localStorageImpl.saveUserPreferences;

export const generateShareToken = USE_SUPABASE_STORAGE
  ? supabaseStorageImpl.generateShareToken
  : () => Promise.resolve(localStorageImpl.generateShareToken());
export const generateInviteToken = USE_SUPABASE_STORAGE
  ? supabaseStorageImpl.generateInviteToken
  : () => Promise.resolve(localStorageImpl.generateInviteToken());

// Check which storage is active
export function isUsingSupabaseStorage(): boolean {
  return USE_SUPABASE_STORAGE;
}
