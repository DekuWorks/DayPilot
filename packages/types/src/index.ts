// User types
export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  timezone?: string | null;
  timezone_frozen?: boolean;
  ai_enabled?: boolean;
  ai_credits?: number;
  working_hours_start?: string | null;
  working_hours_end?: string | null;
  focus_block_duration?: number | null;
  created_at: string;
}

// Calendar types
export type CalendarScope = 'personal' | 'organization' | 'location';

export interface Calendar {
  id: string;
  owner_id: string;
  name: string;
  color: string;
  is_default: boolean;
  is_visible?: boolean;
  scope?: CalendarScope;
  organization_id?: string | null;
  location_id?: string | null;
  created_at: string;
}

// Event types
export interface Event {
  id: string;
  calendar_id: string;
  title: string;
  description: string | null;
  start: string;
  end: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  all_day?: boolean;
  color?: string | null;
  icon?: string | null;
  recurrence_rule?: string | null; // RRULE format
  recurrence_end_date?: string | null;
  parent_event_id?: string | null;
  is_recurring_instance?: boolean;
  timezone?: string | null;
  created_at: string;
  updated_at: string;
}

// Reminder types
export interface EventReminder {
  id: string;
  event_id: string;
  reminder_type: 'default' | 'custom' | 'email' | 'push' | 'web';
  minutes_before: number;
  sent_at: string | null;
  created_at: string;
}

// Organization types
export type OrganizationPlan = 'free' | 'team' | 'business' | 'enterprise';
export type OrganizationMemberRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: OrganizationPlan;
  owner_id: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: OrganizationMemberRole;
  created_at: string;
}

// Location types
export interface Location {
  id: string;
  organization_id: string;
  name: string;
  timezone: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  created_at: string;
  updated_at: string;
}

// Booking types
export type BookingLinkType = 'one-on-one' | 'group';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface BookingLink {
  id: string;
  owner_user_id: string | null;
  organization_id: string | null;
  type: BookingLinkType;
  slug: string;
  title: string | null;
  description: string | null;
  duration: number; // minutes
  buffer_before: number; // minutes
  buffer_after: number; // minutes
  min_notice: number; // minutes
  max_per_day: number | null;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityRule {
  id: string;
  booking_link_id: string;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  start_time: string; // TIME format
  end_time: string; // TIME format
  is_available: boolean;
  created_at: string;
}

export interface BookingExcludedDate {
  id: string;
  booking_link_id: string;
  excluded_date: string; // DATE format
  reason: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  booking_link_id: string;
  event_id: string | null;
  booker_name: string;
  booker_email: string;
  booker_phone: string | null;
  start_time: string;
  end_time: string;
  timezone: string;
  notes: string | null;
  status: BookingStatus;
  confirmation_token: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

// AI types
export type AIActionType = 'generate_day';
export type AIActionStatus = 'draft' | 'applied' | 'rejected';

export interface AIAction {
  id: string;
  user_id: string;
  action_type: AIActionType;
  input: Record<string, unknown>;
  output: {
    blocks: AIBlock[];
    alternatives?: AIBlock[][];
    notes?: string;
    conflicts?: string[];
  };
  status: AIActionStatus;
  created_events?: string[]; // Array of event IDs
  created_at: string;
  updated_at: string;
}

export interface AIBlock {
  start: string; // ISO timestamp
  end: string; // ISO timestamp
  title: string;
  type: 'event' | 'task' | 'break' | 'focus_block';
  reason?: string;
  description?: string;
}

// Billing types
export type SubscriptionTier = 'free' | 'student' | 'team' | 'enterprise';
export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'unpaid'
  | 'incomplete'
  | 'trialing';

export interface StripeCustomer {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  status: SubscriptionStatus;
  tier: SubscriptionTier;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface Entitlements {
  user_id: string;
  tier: SubscriptionTier;
  ai_enabled: boolean;
  ai_credits: number;
  max_connected_calendars: number;
  sync_frequency_minutes: number;
  booking_links_enabled: boolean;
  updated_at: string;
}

// Google Calendar Sync types
export interface ConnectedAccount {
  id: string;
  user_id: string;
  provider: 'google' | 'outlook' | 'apple';
  provider_account_id: string;
  email: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  scope: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export interface CalendarMapping {
  id: string;
  connected_account_id: string;
  daypilot_calendar_id: string;
  provider_calendar_id: string;
  provider_calendar_name: string | null;
  sync_enabled: boolean;
  sync_direction: 'import' | 'export' | 'bidirectional';
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventMapping {
  id: string;
  calendar_mapping_id: string;
  daypilot_event_id: string;
  provider_event_id: string;
  provider_etag: string | null;
  last_synced_at: string;
  created_at: string;
}
export interface SyncState {
  id: string;
  calendar_mapping_id: string;
  sync_token: string | null;
  last_sync_token: string | null;
  last_sync_at: string | null;
  sync_status: 'idle' | 'syncing' | 'error';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// Task types - Calendar-native tasks
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null; // ISO date string
  duration: number | null; // minutes
  priority: TaskPriority;
  status: TaskStatus;
  category_id: string | null; // Reference to Tag/Category
  converted_to_event_id: string | null; // If converted to event
  created_at: string;
  updated_at: string;
}

// Tag/Category types for color coding
export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string | null;
  created_at: string;
}

// Public share types
export interface PublicShare {
  id: string;
  user_id: string;
  calendar_id: string;
  share_token: string; // Unique token for the share link
  is_busy_only: boolean; // If true, only show busy/free, not event details
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// ShareLink types (simplified for localStorage MVP)
export type ShareMode = 'readOnly' | 'busyOnly';

export interface ShareLink {
  id: string;
  userId: string;
  token: string; // Unguessable token for public access
  mode: ShareMode;
  createdAt: string;
  revokedAt: string | null;
}

// Attendee types
export type AttendeeRole = 'organizer' | 'attendee';
export type RSVPStatus = 'going' | 'maybe' | 'declined' | 'pending';

export interface Attendee {
  id: string;
  eventId: string;
  email: string;
  name: string | null;
  role: AttendeeRole;
  rsvpStatus: RSVPStatus;
  inviteToken: string; // For public RSVP links
  createdAt: string;
  updatedAt: string;
}
