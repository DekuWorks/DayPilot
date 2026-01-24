import { useState } from 'react';
import { Button, Input, Label, Badge } from '@daypilot/ui';
import {
  useEventAttendees,
  useAddAttendee,
  useRemoveAttendee,
} from '@daypilot/lib';
import type { RSVPStatus } from '@daypilot/types';

interface AttendeeManagerProps {
  eventId: string;
  organizerEmail: string;
}

export function AttendeeManager({ eventId, organizerEmail }: AttendeeManagerProps) {
  const { data: attendees = [], isLoading } = useEventAttendees(eventId);
  const addAttendee = useAddAttendee();
  const removeAttendee = useRemoveAttendee();
  
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Ensure organizer is always present
  const organizer = attendees.find(a => a.role === 'organizer') || {
    id: 'organizer',
    eventId,
    email: organizerEmail,
    name: null,
    role: 'organizer' as const,
    rsvpStatus: 'going' as RSVPStatus,
    inviteToken: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const otherAttendees = attendees.filter(a => a.role !== 'organizer');

  const handleAddAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    try {
      const newAttendee = await addAttendee.mutateAsync({
        eventId,
        email: emailInput.trim(),
        name: nameInput.trim() || undefined,
        role: 'attendee',
      });
      
      // Send invite email via Edge Function
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co') {
          // Call Edge Function to send invite email
          fetch(`${supabaseUrl}/functions/v1/send-event-invite`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ attendeeId: newAttendee.id }),
          }).catch((err) => {
            console.error('Error triggering invite email:', err);
            // Don't block attendee addition if email fails
          });
        }
      } catch (emailError) {
        console.error('Failed to send invite email:', emailError);
        // Don't block attendee addition if email fails
      }
      
      setEmailInput('');
      setNameInput('');
      setIsAdding(false);
    } catch (error: any) {
      alert(error.message || 'Failed to add attendee');
    }
  };

  const handleRemoveAttendee = async (attendeeId: string) => {
    if (!confirm('Remove this attendee?')) return;
    try {
      await removeAttendee.mutateAsync({ attendeeId, eventId });
    } catch (error: any) {
      alert(error.message || 'Failed to remove attendee');
    }
  };

  const getRSVPBadgeColor = (status: RSVPStatus) => {
    switch (status) {
      case 'going':
        return 'bg-green-100 text-green-700';
      case 'maybe':
        return 'bg-yellow-100 text-yellow-700';
      case 'declined':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return <div className="text-sm text-[var(--muted)]">Loading attendees...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold text-[var(--text)]">
          Attendees
        </Label>
        {!isAdding && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAdding(true)}
            className="!text-xs !px-3"
          >
            + Add
          </Button>
        )}
      </div>

      {/* Add Attendee Form */}
      {isAdding && (
        <form onSubmit={handleAddAttendee} className="p-3 bg-[var(--surface-2)] rounded-lg space-y-2">
          <div>
            <Input
              type="email"
              placeholder="Email address"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              required
              className="text-sm"
            />
          </div>
          <div>
            <Input
              type="text"
              placeholder="Name (optional)"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="!text-xs flex-1">
              Add
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAdding(false);
                setEmailInput('');
                setNameInput('');
              }}
              className="!text-xs flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Attendees List */}
      <div className="space-y-2">
        {/* Organizer (always present, locked) */}
        <div className="flex items-center justify-between p-2 bg-[var(--surface-2)] rounded-lg">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm font-medium text-[var(--text)] truncate">
              {organizer.name || organizer.email}
            </span>
            <Badge variant="default" className="!text-xs">
              Organizer
            </Badge>
            <Badge className={`!text-xs ${getRSVPBadgeColor(organizer.rsvpStatus)}`}>
              {organizer.rsvpStatus === 'going' ? 'Going' :
               organizer.rsvpStatus === 'maybe' ? 'Maybe' :
               organizer.rsvpStatus === 'declined' ? 'Declined' : 'Pending'}
            </Badge>
          </div>
        </div>

        {/* Other Attendees */}
        {otherAttendees.map((attendee) => (
          <div key={attendee.id} className="flex items-center justify-between p-2 bg-[var(--surface-2)] rounded-lg">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm text-[var(--text)] truncate">
                {attendee.name || attendee.email}
              </span>
              <Badge className={`!text-xs ${getRSVPBadgeColor(attendee.rsvpStatus)}`}>
                {attendee.rsvpStatus === 'going' ? 'Going' :
                 attendee.rsvpStatus === 'maybe' ? 'Maybe' :
                 attendee.rsvpStatus === 'declined' ? 'Declined' : 'Pending'}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRemoveAttendee(attendee.id)}
              className="!text-xs !px-2"
            >
              Remove
            </Button>
          </div>
        ))}

        {otherAttendees.length === 0 && !isAdding && (
          <p className="text-xs text-[var(--muted)] text-center py-2">
            No other attendees yet
          </p>
        )}
      </div>
    </div>
  );
}
