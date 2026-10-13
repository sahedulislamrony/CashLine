import { calendarDate as d, InvalidCalendarDateError } from './calendar-date';
import { dateRange, daysInRange, monthOf, rangeContains, rangesOverlap } from './date-range';

describe('dateRange', () => {
  it('creates a frozen range and allows a single day', () => {
    const range = dateRange(d('2025-01-01'), d('2025-01-31'));
    expect(range).toEqual({ start: '2025-01-01', end: '2025-01-31' });
    expect(Object.isFrozen(range)).toBe(true);
    expect(daysInRange(dateRange(d('2025-01-01'), d('2025-01-01')))).toBe(1);
  });

  it('rejects an end before the start', () => {
    expect(() => dateRange(d('2025-01-02'), d('2025-01-01'))).toThrow(InvalidCalendarDateError);
  });

  it('includes both ends', () => {
    const range = dateRange(d('2025-01-10'), d('2025-01-20'));
    expect(rangeContains(range, d('2025-01-10'))).toBe(true);
    expect(rangeContains(range, d('2025-01-20'))).toBe(true);
    expect(rangeContains(range, d('2025-01-15'))).toBe(true);
    expect(rangeContains(range, d('2025-01-09'))).toBe(false);
    expect(rangeContains(range, d('2025-01-21'))).toBe(false);
    expect(daysInRange(range)).toBe(11);
  });

  it('counts days across leap years', () => {
    expect(daysInRange(dateRange(d('2024-01-01'), d('2024-12-31')))).toBe(366);
    expect(daysInRange(dateRange(d('2025-01-01'), d('2025-12-31')))).toBe(365);
  });

  it('detects overlap, including a shared boundary day', () => {
    const january = monthOf(d('2025-01-15'));
    expect(rangesOverlap(january, dateRange(d('2025-01-31'), d('2025-02-05')))).toBe(true);
    expect(rangesOverlap(january, dateRange(d('2025-02-01'), d('2025-02-05')))).toBe(false);
    expect(rangesOverlap(dateRange(d('2024-12-01'), d('2025-01-01')), january)).toBe(true);
    expect(rangesOverlap(january, dateRange(d('2025-01-10'), d('2025-01-12')))).toBe(true);
  });

  it('gives the whole month', () => {
    expect(monthOf(d('2024-02-10'))).toEqual({ start: '2024-02-01', end: '2024-02-29' });
    expect(monthOf(d('2025-12-31'))).toEqual({ start: '2025-12-01', end: '2025-12-31' });
  });
});
