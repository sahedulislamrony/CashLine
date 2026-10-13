/**
 * Calendar dates without a time or time zone, as `YYYY-MM-DD` text
 * (docs/project-specifications.md §8). Entry, invoice and due dates use this
 * type. All arithmetic is done on day numbers, never through `Date`, so time
 * zones and daylight-saving changes cannot shift a date.
 */

declare const calendarDateBrand: unique symbol;

/** A validated `YYYY-MM-DD` date. Text order equals date order. */
export type CalendarDate = string & { readonly [calendarDateBrand]: true };

export type DateParts = { readonly year: number; readonly month: number; readonly day: number };

/** ISO weekday: 1 is Monday, 7 is Sunday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const MIN_YEAR = 1;
export const MAX_YEAR = 9999;

export class InvalidCalendarDateError extends Error {
  constructor(message = 'Not a valid calendar date') {
    super(message);
    this.name = 'InvalidCalendarDateError';
  }
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const monthLengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function daysInMonth(year: number, month: number): number {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new InvalidCalendarDateError();
  }
  return month === 2 && isLeapYear(year) ? 29 : (monthLengths[month - 1] ?? 0);
}

function isValidParts(year: number, month: number, day: number): boolean {
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    year >= MIN_YEAR &&
    year <= MAX_YEAR &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month)
  );
}

/** Builds a date from numeric parts, rejecting dates that do not exist. */
export function fromParts(year: number, month: number, day: number): CalendarDate {
  if (!isValidParts(year, month, day)) {
    throw new InvalidCalendarDateError();
  }
  const pad = (value: number, length: number) => String(value).padStart(length, '0');
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}` as CalendarDate;
}

const pattern = /^(\d{4})-(\d{2})-(\d{2})$/;

function parse(text: unknown): DateParts | undefined {
  const match = typeof text === 'string' ? pattern.exec(text) : null;
  if (!match) {
    return undefined;
  }
  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  return isValidParts(parts.year, parts.month, parts.day) ? parts : undefined;
}

/** True for exact `YYYY-MM-DD` text that names a real date. */
export function isCalendarDate(value: unknown): value is CalendarDate {
  return parse(value) !== undefined;
}

/** Validates `YYYY-MM-DD` text. Throws for anything else, including "2025-02-30". */
export function calendarDate(text: string): CalendarDate {
  if (!isCalendarDate(text)) {
    throw new InvalidCalendarDateError();
  }
  return text;
}

export function toParts(date: CalendarDate): DateParts {
  const parts = parse(date);
  if (!parts) {
    throw new InvalidCalendarDateError();
  }
  return parts;
}

// Day numbers count days since 1970-01-01 in the proleptic Gregorian calendar.
function toDayNumber({ year, month, day }: DateParts): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yearOfEra = y - era * 400;
  const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

function fromDayNumber(dayNumber: number): CalendarDate {
  const z = dayNumber + 719468;
  const era = Math.floor(z / 146097);
  const dayOfEra = z - era * 146097;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36524) -
      Math.floor(dayOfEra / 146096)) /
      365,
  );
  const dayOfYear =
    dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const monthIndex = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * monthIndex + 2) / 5) + 1;
  const month = monthIndex < 10 ? monthIndex + 3 : monthIndex - 9;
  return fromParts(yearOfEra + era * 400 + (month <= 2 ? 1 : 0), month, day);
}

function assertInteger(value: number): void {
  if (!Number.isSafeInteger(value)) {
    throw new InvalidCalendarDateError('Expected a whole number');
  }
}

/** Adds (or, when negative, subtracts) whole days. */
export function addDays(date: CalendarDate, days: number): CalendarDate {
  assertInteger(days);
  return fromDayNumber(toDayNumber(toParts(date)) + days);
}

/**
 * Adds whole months. If the target month is shorter, the day is clamped to its
 * last day: 31 January + 1 month is 28 or 29 February.
 */
export function addMonths(date: CalendarDate, months: number): CalendarDate {
  assertInteger(months);
  const { year, month, day } = toParts(date);
  const index = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(index / 12);
  const targetMonth = index - targetYear * 12 + 1;
  if (targetYear < MIN_YEAR || targetYear > MAX_YEAR) {
    throw new InvalidCalendarDateError();
  }
  return fromParts(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)));
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  return toDayNumber(toParts(to)) - toDayNumber(toParts(from));
}

export function compareDates(a: CalendarDate, b: CalendarDate): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function startOfMonth(date: CalendarDate): CalendarDate {
  const { year, month } = toParts(date);
  return fromParts(year, month, 1);
}

export function endOfMonth(date: CalendarDate): CalendarDate {
  const { year, month } = toParts(date);
  return fromParts(year, month, daysInMonth(year, month));
}

export function dayOfWeek(date: CalendarDate): Weekday {
  // 1970-01-01 was a Thursday (4).
  const offset = (((toDayNumber(toParts(date)) + 3) % 7) + 7) % 7;
  return (offset + 1) as Weekday;
}

/** The first day of the week containing `date`, for a week starting on `weekStart`. */
export function startOfWeek(date: CalendarDate, weekStart: Weekday): CalendarDate {
  return addDays(date, -((dayOfWeek(date) - weekStart + 7) % 7));
}

/**
 * The calendar date shown on the device's own clock at `instant`. "Today",
 * overdue checks and month boundaries use this, so they follow the user's
 * current time zone (docs/project-specifications.md §8).
 */
export function localDateOf(instant: Date): CalendarDate {
  if (!(instant instanceof Date) || Number.isNaN(instant.getTime())) {
    throw new InvalidCalendarDateError();
  }
  return fromParts(instant.getFullYear(), instant.getMonth() + 1, instant.getDate());
}

export function today(now: Date = new Date()): CalendarDate {
  return localDateOf(now);
}
