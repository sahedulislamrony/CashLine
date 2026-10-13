import {
  type CalendarDate,
  daysBetween,
  endOfMonth,
  InvalidCalendarDateError,
  startOfMonth,
} from './calendar-date';

/** A span of whole days. Both ends are included. */
export type DateRange = { readonly start: CalendarDate; readonly end: CalendarDate };

export function dateRange(start: CalendarDate, end: CalendarDate): DateRange {
  if (end < start) {
    throw new InvalidCalendarDateError('Range end is before its start');
  }
  return Object.freeze({ start, end });
}

export function rangeContains(range: DateRange, date: CalendarDate): boolean {
  return date >= range.start && date <= range.end;
}

/** Number of days in the range, counting both ends: a single day is 1. */
export function daysInRange(range: DateRange): number {
  return daysBetween(range.start, range.end) + 1;
}

export function rangesOverlap(a: DateRange, b: DateRange): boolean {
  return a.start <= b.end && b.start <= a.end;
}

/** The whole calendar month containing `date`. */
export function monthOf(date: CalendarDate): DateRange {
  return dateRange(startOfMonth(date), endOfMonth(date));
}
