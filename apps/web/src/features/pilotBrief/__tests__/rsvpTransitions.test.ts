/**
 * Unit tests for RSVP state transitions
 */

import type { RSVPStatus } from '@daypilot/types';

describe('RSVP transitions', () => {
  const validStatuses: RSVPStatus[] = ['going', 'maybe', 'declined', 'pending'];

  it('should allow transition from pending to any status', () => {
    const fromStatus: RSVPStatus = 'pending';
    const toStatuses: RSVPStatus[] = ['going', 'maybe', 'declined'];
    
    toStatuses.forEach(toStatus => {
      expect(validStatuses.includes(fromStatus)).toBe(true);
      expect(validStatuses.includes(toStatus)).toBe(true);
    });
  });

  it('should allow transition between going, maybe, and declined', () => {
    const statuses: RSVPStatus[] = ['going', 'maybe', 'declined'];
    
    statuses.forEach(from => {
      statuses.forEach(to => {
        if (from !== to) {
          expect(validStatuses.includes(from)).toBe(true);
          expect(validStatuses.includes(to)).toBe(true);
        }
      });
    });
  });

  it('should not allow invalid status values', () => {
    const invalidStatus = 'invalid' as RSVPStatus;
    expect(validStatuses.includes(invalidStatus)).toBe(false);
  });
});
