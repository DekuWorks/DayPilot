/**
 * Format a date string to a readable format
 */
export function formatDate(date: string | Date): string {
  const dateObject = typeof date === 'string' ? new Date(date) : date;
  return dateObject.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a time string
 */
export function formatTime(date: string | Date, use24Hour = false): string {
  const dateObject = typeof date === 'string' ? new Date(date) : date;
  return dateObject.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: !use24Hour,
  });
}

/**
 * Check if a date is today
 */
export function isToday(date: string | Date): boolean {
  const dateObject = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return (
    dateObject.getDate() === today.getDate() &&
    dateObject.getMonth() === today.getMonth() &&
    dateObject.getFullYear() === today.getFullYear()
  );
}
