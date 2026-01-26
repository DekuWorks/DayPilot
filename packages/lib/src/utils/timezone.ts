/**
 * Get user's timezone
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Convert date to user's local timezone
 */
export function toLocalTime(date: string | Date, timezone?: string): Date {
  const dateObject = typeof date === 'string' ? new Date(date) : date;
  if (!timezone) {
    return dateObject;
  }

  // Convert to the specified timezone
  const localString = dateObject.toLocaleString('en-US', {
    timeZone: timezone,
  });
  return new Date(localString);
}

/**
 * Format date in timezone
 */
export function formatInTimezone(
  date: string | Date,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObject = typeof date === 'string' ? new Date(date) : date;
  return dateObject.toLocaleString('en-US', {
    timeZone: timezone,
    ...options,
  });
}

/**
 * Check if timezone is frozen (travel mode)
 */
export function isTimezoneFrozen(userTimezoneFrozen?: boolean): boolean {
  return userTimezoneFrozen === true;
}
