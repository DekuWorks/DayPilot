// LocalStorage-based storage for MVP (no database required)
// This can be replaced with API calls later

const STORAGE_KEYS = {
  EVENTS: 'daypilot-events',
  TASKS: 'daypilot-tasks',
  CATEGORIES: 'daypilot-categories',
  CALENDARS: 'daypilot-calendars',
  PUBLIC_SHARES: 'daypilot-public-shares',
  SHARE_LINKS: 'daypilot-share-links',
  ATTENDEES: 'daypilot-attendees',
  USER_PREFERENCES: 'daypilot-user-preferences',
} as const;

// Generic storage helpers
export function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return defaultValue;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing to localStorage (${key}):`, error);
  }
}

export function removeStorageItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing from localStorage (${key}):`, error);
  }
}

// Event storage
export function getEvents() {
  return getStorageItem(STORAGE_KEYS.EVENTS, []);
}

export function saveEvents(events: any[]) {
  setStorageItem(STORAGE_KEYS.EVENTS, events);
}

// Task storage
export function getTasks() {
  return getStorageItem(STORAGE_KEYS.TASKS, []);
}

export function saveTasks(tasks: any[]) {
  setStorageItem(STORAGE_KEYS.TASKS, tasks);
}

// Category storage
export function getCategories() {
  return getStorageItem(STORAGE_KEYS.CATEGORIES, []);
}

export function saveCategories(categories: any[]) {
  setStorageItem(STORAGE_KEYS.CATEGORIES, categories);
}

// Calendar storage
export function getCalendars() {
  return getStorageItem(STORAGE_KEYS.CALENDARS, []);
}

export function saveCalendars(calendars: any[]) {
  setStorageItem(STORAGE_KEYS.CALENDARS, calendars);
}

// Public shares storage
export function getPublicShares() {
  return getStorageItem(STORAGE_KEYS.PUBLIC_SHARES, []);
}

export function savePublicShares(shares: any[]) {
  setStorageItem(STORAGE_KEYS.PUBLIC_SHARES, shares);
}

// User preferences
export function getUserPreferences() {
  return getStorageItem(STORAGE_KEYS.USER_PREFERENCES, {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    use24Hour: false,
  });
}

export function saveUserPreferences(preferences: any) {
  setStorageItem(STORAGE_KEYS.USER_PREFERENCES, preferences);
}

// Share links storage
export function getShareLinks() {
  return getStorageItem(STORAGE_KEYS.SHARE_LINKS, []);
}

export function saveShareLinks(shareLinks: any[]) {
  setStorageItem(STORAGE_KEYS.SHARE_LINKS, shareLinks);
}

// Generate unguessable token
export function generateShareToken(): string {
  // Generate a cryptographically random token
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Attendees storage
export function getAttendees() {
  return getStorageItem(STORAGE_KEYS.ATTENDEES, []);
}

export function saveAttendees(attendees: any[]) {
  setStorageItem(STORAGE_KEYS.ATTENDEES, attendees);
}

// Generate invite token for RSVP
export function generateInviteToken(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Note: These functions are now wrapped by storageAdapter.ts
// The adapter chooses between localStorage and Supabase based on VITE_USE_SUPABASE_STORAGE
