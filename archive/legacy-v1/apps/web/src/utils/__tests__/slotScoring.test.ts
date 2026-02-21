/**
 * Unit tests for slot scoring
 */

import { scoreSlot, scoreAndSortSlots } from '../slotScoring';

describe('slotScoring', () => {
  describe('scoreSlot', () => {
    it('should prefer earlier slots for today', () => {
      const now = new Date();
      const slot1 = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
      const slot2 = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours from now

      const score1 = scoreSlot(slot1, [], 0, 0, true, false);
      const score2 = scoreSlot(slot2, [], 0, 0, true, false);

      expect(score1).toBeGreaterThan(score2);
    });

    it('should penalize back-to-back slots', () => {
      const slot = new Date('2024-01-15T10:00:00');
      const existingBookings = [
        {
          start: new Date('2024-01-15T09:30:00'),
          end: new Date('2024-01-15T10:00:00'),
        },
      ];

      const scoreWithConflict = scoreSlot(
        slot,
        existingBookings,
        0,
        0,
        false,
        false
      );
      const scoreWithoutConflict = scoreSlot(slot, [], 0, 0, false, false);

      expect(scoreWithoutConflict).toBeGreaterThan(scoreWithConflict);
    });

    it('should penalize focus blocks', () => {
      const focusSlot = new Date('2024-01-15T07:00:00'); // Early morning
      const normalSlot = new Date('2024-01-15T11:00:00'); // Mid-morning

      const focusScore = scoreSlot(focusSlot, [], 0, 0, false, true);
      const normalScore = scoreSlot(normalSlot, [], 0, 0, false, false);

      expect(normalScore).toBeGreaterThan(focusScore);
    });
  });

  describe('scoreAndSortSlots', () => {
    it('should sort slots by score (highest first)', () => {
      const slots = ['10:00', '14:00', '09:00'];
      const date = new Date('2024-01-15');

      const scored = scoreAndSortSlots(slots, date, [], 0, 0);

      expect(scored[0].score).toBeGreaterThanOrEqual(scored[1].score);
      expect(scored[1].score).toBeGreaterThanOrEqual(scored[2].score);
    });

    it('should prefer earlier times when scores are similar', () => {
      const slots = ['14:00', '09:00', '10:00'];
      const date = new Date('2024-01-15');

      const scored = scoreAndSortSlots(slots, date, [], 0, 0);

      // When scores are close, earlier times should come first
      const times = scored.map(s => s.time);
      expect(times[0] < times[1] || times[0] < times[2]).toBe(true);
    });
  });
});
