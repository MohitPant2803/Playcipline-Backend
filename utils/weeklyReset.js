/**
 * Utility functions for managing weekly leaderboard resets
 */

/**
 * Get the start of the current week (Sunday 00:00:00)
 */
export const getWeekStart = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
};

/**
 * Get the end of the current week (Saturday 23:59:59)
 */
export const getWeekEnd = (date = new Date()) => {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
};

/**
 * Get the time remaining until end of week in milliseconds
 */
export const getTimeUntilWeekEnd = (date = new Date()) => {
  const weekEnd = getWeekEnd(date);
  const now = new Date(date);
  const diff = weekEnd - now;
  return Math.max(0, diff);
};

/**
 * Check if it's time to reset the weekly scores
 * Returns true if lastResetDate is before the current week start
 */
export const shouldResetWeekly = (lastResetDate) => {
  const now = new Date();
  const lastReset = new Date(lastResetDate);
  const currentWeekStart = getWeekStart(now);
  
  return lastReset < currentWeekStart;
};

/**
 * Get the next reset time (start of next Sunday 00:00:00)
 */
export const getNextResetTime = (date = new Date()) => {
  const nextWeekStart = new Date(getWeekStart(date));
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  return nextWeekStart;
};
