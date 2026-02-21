// Attendee types for event collaboration
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
