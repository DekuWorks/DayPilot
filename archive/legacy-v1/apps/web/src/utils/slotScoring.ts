/**
 * Slot scoring utilities for booking links
 * Prefers earlier slots, avoids back-to-back clusters, respects focus blocks
 */

export interface ScoredSlot {
  time: string;
  score: number;
  date: Date;
}

/**
 * Score a time slot for booking
 * Higher score = better slot
 */
export function scoreSlot(
  slotTime: Date,
  existingBookings: Array<{ start: Date; end: Date }>,
  _bufferBefore: number,
  _bufferAfter: number,
  isToday: boolean,
  isFocusBlock: boolean = false
): number {
  let score = 100;

  // Prefer earlier slots (especially today)
  const hoursFromNow = (slotTime.getTime() - Date.now()) / (1000 * 60 * 60);
  if (isToday) {
    score += 30; // Bonus for same-day availability
    score += Math.max(0, 20 - hoursFromNow); // Prefer slots sooner today
  } else {
    // For future days, prefer morning slots
    const hourOfDay = slotTime.getHours();
    if (hourOfDay < 12) {
      score += 15; // Morning bonus
    } else if (hourOfDay < 14) {
      score += 10; // Early afternoon
    }
  }

  // Penalize back-to-back clusters
  const slotStart = new Date(slotTime);
  const slotEnd = new Date(slotTime);
  slotEnd.setMinutes(slotEnd.getMinutes() + 30); // Assume 30 min duration for scoring

  const nearbyBookings = existingBookings.filter(booking => {
    const gapBefore =
      (slotStart.getTime() - booking.end.getTime()) / (1000 * 60);
    const gapAfter =
      (booking.start.getTime() - slotEnd.getTime()) / (1000 * 60);
    return (
      (gapBefore >= 0 && gapBefore < 30) || (gapAfter >= 0 && gapAfter < 30)
    );
  });

  if (nearbyBookings.length > 0) {
    score -= nearbyBookings.length * 10; // Penalty for back-to-back
  }

  // Prefer slots with buffers (no nearby bookings)
  if (nearbyBookings.length === 0) {
    score += 15; // Bonus for isolated slots
  }

  // Avoid focus blocks (if detected)
  if (isFocusBlock) {
    score -= 20; // Penalty for scheduling during focus time
  }

  return Math.max(0, score);
}

/**
 * Sort and score available slots
 */
export function scoreAndSortSlots(
  slots: string[],
  date: Date,
  existingBookings: Array<{ start: Date; end: Date }>,
  bufferBefore: number,
  bufferAfter: number
): ScoredSlot[] {
  const isToday = date.toDateString() === new Date().toDateString();

  const scored = slots.map(time => {
    const [hours, minutes] = time.split(':').map(Number);
    const slotTime = new Date(date);
    slotTime.setHours(hours, minutes, 0, 0);

    // Check if this might be a focus block (heuristic: early morning or late afternoon)
    const hour = slotTime.getHours();
    const isFocusBlock = (hour >= 6 && hour < 9) || (hour >= 14 && hour < 17);

    const score = scoreSlot(
      slotTime,
      existingBookings,
      bufferBefore,
      bufferAfter,
      isToday,
      isFocusBlock
    );

    return {
      time,
      score,
      date,
    };
  });

  // Sort by score (highest first), then by time (earliest first)
  return scored.sort((a, b) => {
    if (Math.abs(a.score - b.score) > 5) {
      return b.score - a.score; // Significant score difference
    }
    return a.time.localeCompare(b.time); // Same score, prefer earlier
  });
}
