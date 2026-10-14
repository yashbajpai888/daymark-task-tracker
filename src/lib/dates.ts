import { format, subDays, addDays } from "date-fns";
import { toZonedTime, format as formatZoned } from "date-fns-tz";

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

/**
 * Gets the current local date in YYYY-MM-DD for a given IANA time zone.
 */
export function getLocalDateString(timeZone: string = DEFAULT_TIMEZONE, date: Date = new Date()): string {
  try {
    const zonedDate = toZonedTime(date, timeZone);
    return formatZoned(zonedDate, "yyyy-MM-dd", { timeZone });
  } catch {
    // Fallback if timezone string is invalid
    return format(date, "yyyy-MM-dd");
  }
}

/**
 * Gets yesterday's local date string in YYYY-MM-DD.
 */
export function getPreviousLocalDateString(timeZone: string = DEFAULT_TIMEZONE, localDateStr?: string): string {
  const baseDate = localDateStr ? parseLocalDateString(localDateStr) : new Date();
  const prevDate = subDays(baseDate, 1);
  return getLocalDateString(timeZone, prevDate);
}

/**
 * Gets tomorrow's local date string in YYYY-MM-DD.
 */
export function getNextLocalDateString(timeZone: string = DEFAULT_TIMEZONE, localDateStr?: string): string {
  const baseDate = localDateStr ? parseLocalDateString(localDateStr) : new Date();
  const nextDate = addDays(baseDate, 1);
  return getLocalDateString(timeZone, nextDate);
}

/**
 * Parses YYYY-MM-DD into a local Date object.
 */
export function parseLocalDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0); // midday avoids any DST edge transitions
}

/**
 * Formats a local date string for display (e.g. "Tuesday, 13 Oct 2026")
 */
export function formatDisplayDate(dateStr: string): string {
  try {
    const date = parseLocalDateString(dateStr);
    return format(date, "EEEE, d MMM yyyy");
  } catch {
    return dateStr;
  }
}

/**
 * Formats a short date for calendar or headers (e.g. "Tue, 13 Oct")
 */
export function formatShortDate(dateStr: string): string {
  try {
    const date = parseLocalDateString(dateStr);
    return format(date, "EEE, d MMM");
  } catch {
    return dateStr;
  }
}

/**
 * Formats day of week (e.g. "Mon")
 */
export function formatDayOfWeek(dateStr: string): string {
  try {
    const date = parseLocalDateString(dateStr);
    return format(date, "EEE");
  } catch {
    return "";
  }
}

/**
 * Returns true if dateStr is today in the given timezone.
 */
export function isTodayLocal(dateStr: string, timeZone: string = DEFAULT_TIMEZONE): boolean {
  return dateStr === getLocalDateString(timeZone);
}

/**
 * Returns weekday index: 0 = Sunday, 1 = Monday, ... 6 = Saturday
 */
export function getWeekdayIndex(dateStr: string): number {
  const date = parseLocalDateString(dateStr);
  return date.getDay();
}

/**
 * Formats time string (HH:mm) to 12-hour display (e.g. "09:00 AM")
 */
export function formatTimeDisplay(timeStr?: string): string {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}
