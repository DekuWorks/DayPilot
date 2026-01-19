// User types
export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  timezone?: string | null;
  timezone_frozen?: boolean;
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

