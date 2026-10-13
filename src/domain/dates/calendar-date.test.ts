import * as fc from 'fast-check';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  addDays,
  addMonths,
  calendarDate,
  compareDates,
  dayOfWeek,
  daysBetween,
  daysInMonth,
  endOfMonth,
  fromParts,
  InvalidCalendarDateError,
  isCalendarDate,
  isLeapYear,
  localDateOf,
  startOfMonth,
  startOfWeek,
  today,
  toParts,
  type Weekday,
} from './calendar-date';

const d = calendarDate;

// Any valid date from 0001-01-01 to 9999-12-31, generated from UTC day numbers.
const anyDate = fc
  .integer({ min: -719162, max: 2932896 })
  .map((day) => new Date(day * 86400000).toISOString().slice(0, 10))
  .filter(isCalendarDate);

describe('validation', () => {
  it.each(['2025-01-01', '2024-02-29', '2000-02-29', '0001-01-01', '9999-12-31', '2025-12-31'])(
    'accepts %s',
    (text) => {
      expect(isCalendarDate(text)).toBe(true);
      expect(calendarDate(text)).toBe(text);
    },
  );

  it.each([
    '2025-02-29',
    '1900-02-29',
    '2100-02-29',
    '2025-02-30',
    '2025-04-31',
    '2025-13-01',
    '2025-00-10',
    '2025-01-00',
    '2025-01-32',
    '0000-01-01',
    '2025-1-1',
    '25-01-01',
    '2025/01/01',
    '2025-01-01T00:00:00Z',
    ' 2025-01-01',
    '2025-01-01 ',
    '20250101',
    '٢٠٢٥-٠١-٠١',
    '',
    'today',
  ])('rejects %p', (text) => {
    expect(isCalendarDate(text)).toBe(false);
    expect(() => calendarDate(text)).toThrow(InvalidCalendarDateError);
  });

  it.each([undefined, null, 20250101, new Date(), {}])('rejects non-string %p', (value) => {
    expect(isCalendarDate(value)).toBe(false);
  });

  it('builds from and splits into parts', () => {
    expect(fromParts(2025, 3, 9)).toBe('2025-03-09');
    expect(fromParts(1, 1, 1)).toBe('0001-01-01');
    expect(toParts(d('2025-03-09'))).toEqual({ year: 2025, month: 3, day: 9 });
  });

  it.each([
    [2025, 2, 29],
    [2025, 13, 1],
    [2025, 0, 1],
    [0, 1, 1],
    [10000, 1, 1],
    [2025, 1.5, 1],
    [2025, 1, NaN],
    [-1, 1, 1],
  ])('fromParts rejects %p-%p-%p', (year, month, day) => {
    expect(() => fromParts(year, month, day)).toThrow(InvalidCalendarDateError);
  });

  it('toParts rejects text that bypassed validation', () => {
    expect(() => toParts('2025-02-30' as never)).toThrow(InvalidCalendarDateError);
  });
});

describe('leap years and month lengths', () => {
  it.each([
    [2024, true],
    [2025, false],
    [2000, true],
    [1900, false],
    [2100, false],
    [2400, true],
  ])('%d leap: %p', (year, leap) => {
    expect(isLeapYear(year)).toBe(leap);
    expect(daysInMonth(year, 2)).toBe(leap ? 29 : 28);
  });

  it('knows every month length', () => {
    const lengths = Array.from({ length: 12 }, (_, i) => daysInMonth(2025, i + 1));
    expect(lengths).toEqual([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
  });

  it.each([0, 13, 1.5])('daysInMonth rejects month %p', (month) => {
    expect(() => daysInMonth(2025, month)).toThrow(InvalidCalendarDateError);
  });
});

describe('addDays and daysBetween', () => {
  it.each([
    ['2025-01-31', 1, '2025-02-01'],
    ['2025-02-28', 1, '2025-03-01'],
    ['2024-02-28', 1, '2024-02-29'],
    ['2024-02-29', 1, '2024-03-01'],
    ['2025-12-31', 1, '2026-01-01'],
    ['2025-01-01', -1, '2024-12-31'],
    ['2025-03-01', -1, '2025-02-28'],
    ['2025-01-15', 0, '2025-01-15'],
    ['2025-01-01', 365, '2026-01-01'],
    ['2024-01-01', 366, '2025-01-01'],
    ['2000-01-01', 36525, '2100-01-01'],
    ['1970-01-01', -1, '1969-12-31'],
  ])('%s + %d days = %s', (start, days, expected) => {
    expect(addDays(d(start), days)).toBe(expected);
    expect(daysBetween(d(start), d(expected))).toBe(days);
  });

  it('rejects results outside the supported years and fractional days', () => {
    expect(() => addDays(d('9999-12-31'), 1)).toThrow(InvalidCalendarDateError);
    expect(() => addDays(d('0001-01-01'), -1)).toThrow(InvalidCalendarDateError);
    expect(() => addDays(d('2025-01-01'), 0.5)).toThrow(InvalidCalendarDateError);
    expect(() => addDays(d('2025-01-01'), NaN)).toThrow(InvalidCalendarDateError);
  });

  it('agrees with UTC date arithmetic and is reversible', () => {
    fc.assert(
      fc.property(anyDate, fc.integer({ min: -4000, max: 4000 }), (date, days) => {
        const expected = new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000);
        if (expected.getUTCFullYear() < 1 || expected.getUTCFullYear() > 9999) {
          return;
        }
        const result = addDays(date, days);
        expect(result).toBe(expected.toISOString().slice(0, 10));
        expect(addDays(result, -days)).toBe(date);
        expect(daysBetween(date, result)).toBe(days);
      }),
    );
  });
});

describe('addMonths', () => {
  it.each([
    ['2025-01-15', 1, '2025-02-15'],
    ['2025-01-31', 1, '2025-02-28'],
    ['2024-01-31', 1, '2024-02-29'],
    ['2025-03-31', 1, '2025-04-30'],
    ['2025-03-31', -1, '2025-02-28'],
    ['2025-12-15', 1, '2026-01-15'],
    ['2025-01-15', -1, '2024-12-15'],
    ['2024-02-29', 12, '2025-02-28'],
    ['2024-02-29', 48, '2028-02-29'],
    ['2025-05-31', 0, '2025-05-31'],
    ['2025-01-31', 13, '2026-02-28'],
    ['2025-10-31', -8, '2025-02-28'],
  ])('%s + %d months = %s', (start, months, expected) => {
    expect(addMonths(d(start), months)).toBe(expected);
  });

  it('rejects results outside the supported years and fractional months', () => {
    expect(() => addMonths(d('9999-12-01'), 1)).toThrow(InvalidCalendarDateError);
    expect(() => addMonths(d('0001-01-01'), -1)).toThrow(InvalidCalendarDateError);
    expect(() => addMonths(d('2025-01-01'), 1.5)).toThrow(InvalidCalendarDateError);
  });

  it('keeps the day when it exists, otherwise uses the last day of the month', () => {
    fc.assert(
      fc.property(anyDate, fc.integer({ min: -240, max: 240 }), (date, months) => {
        const { year, month, day } = toParts(date);
        const index = year * 12 + month - 1 + months;
        if (index < 12 || index > 9999 * 12 + 11) {
          return;
        }
        const result = toParts(addMonths(date, months));
        expect(result.year * 12 + result.month - 1).toBe(index);
        expect(result.day).toBe(Math.min(day, daysInMonth(result.year, result.month)));
      }),
    );
  });
});

describe('ordering and month boundaries', () => {
  it('compares dates', () => {
    expect(compareDates(d('2025-01-01'), d('2025-01-02'))).toBe(-1);
    expect(compareDates(d('2025-01-02'), d('2025-01-02'))).toBe(0);
    expect(compareDates(d('2025-10-01'), d('2025-09-30'))).toBe(1);
  });

  it('text order equals date order', () => {
    fc.assert(
      fc.property(anyDate, anyDate, (a, b) => {
        expect(compareDates(a, b)).toBe(Math.sign(daysBetween(b, a)));
      }),
    );
  });

  it.each([
    ['2025-02-14', '2025-02-01', '2025-02-28'],
    ['2024-02-14', '2024-02-01', '2024-02-29'],
    ['2025-12-31', '2025-12-01', '2025-12-31'],
    ['2025-04-01', '2025-04-01', '2025-04-30'],
  ])('month of %s runs %s to %s', (date, start, end) => {
    expect(startOfMonth(d(date))).toBe(start);
    expect(endOfMonth(d(date))).toBe(end);
  });
});

describe('weekdays', () => {
  it.each([
    ['1970-01-01', 4],
    ['2000-01-01', 6],
    ['2024-02-29', 4],
    ['2025-01-01', 3],
    ['2026-10-12', 1],
    ['2026-10-18', 7],
    ['0001-01-01', 1],
  ])('%s is weekday %d', (date, weekday) => {
    expect(dayOfWeek(d(date))).toBe(weekday);
  });

  it.each([
    // date (a Wednesday), week start, expected
    ['2026-10-14', 1, '2026-10-12'],
    ['2026-10-14', 7, '2026-10-11'],
    ['2026-10-14', 6, '2026-10-10'],
    ['2026-10-14', 3, '2026-10-14'],
    ['2026-10-14', 4, '2026-10-08'],
    ['2026-01-01', 1, '2025-12-29'],
  ])('week of %s starting on %d begins %s', (date, weekStart, expected) => {
    expect(startOfWeek(d(date), weekStart as Weekday)).toBe(expected);
  });

  it('agrees with UTC weekdays, and week starts are within six days', () => {
    fc.assert(
      fc.property(anyDate, fc.constantFrom<Weekday>(1, 2, 3, 4, 5, 6, 7), (date, weekStart) => {
        const utc = new Date(`${date}T00:00:00Z`).getUTCDay();
        expect(dayOfWeek(date)).toBe(utc === 0 ? 7 : utc);
        if (date < '0001-01-08') {
          return;
        }
        const start = startOfWeek(date, weekStart);
        expect(dayOfWeek(start)).toBe(weekStart);
        const back = daysBetween(start, date);
        expect(back >= 0 && back <= 6).toBe(true);
      }),
    );
  });
});

describe('local date of an instant', () => {
  // Jest cannot change the process time zone, so the zone cases run in a child
  // Node process that loads the same module and switches TZ for each case.
  function localDatesInZones(cases: readonly (readonly [zone: string, instant: string])[]) {
    const script = `
      const { localDateOf } = await import(${JSON.stringify(
        pathToFileURL(path.join(__dirname, 'calendar-date.ts')).href,
      )});
      const out = [];
      for (const [zone, instant] of ${JSON.stringify(cases)}) {
        process.env.TZ = zone;
        out.push(localDateOf(new Date(instant)));
      }
      console.log(JSON.stringify(out));
    `;
    const stdout = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      encoding: 'utf8',
      env: { ...process.env, NODE_NO_WARNINGS: '1' },
    });
    return JSON.parse(stdout) as string[];
  }

  const zoneCases = [
    // The same instant falls on different calendar dates around the world.
    ['UTC', '2026-01-01T00:30:00Z', '2026-01-01'],
    ['America/Los_Angeles', '2026-01-01T00:30:00Z', '2025-12-31'],
    ['Asia/Dhaka', '2025-12-31T18:30:00Z', '2026-01-01'],
    ['Pacific/Kiritimati', '2025-12-31T10:30:00Z', '2026-01-01'],
    ['Pacific/Pago_Pago', '2026-01-01T10:30:00Z', '2025-12-31'],
    // Around daylight-saving changes the date is still the wall-clock date.
    ['America/New_York', '2026-03-08T06:59:00Z', '2026-03-08'],
    ['America/New_York', '2026-03-08T07:01:00Z', '2026-03-08'],
    ['America/New_York', '2026-03-08T04:59:00Z', '2026-03-07'],
    ['America/New_York', '2026-11-01T05:30:00Z', '2026-11-01'],
    ['Europe/London', '2026-03-28T23:59:00Z', '2026-03-28'],
    ['Europe/London', '2026-03-29T23:30:00Z', '2026-03-30'],
    // The device moves to another zone: the same instant now reads as the next day.
    ['UTC', '2026-06-15T23:30:00Z', '2026-06-15'],
    ['Asia/Tokyo', '2026-06-15T23:30:00Z', '2026-06-16'],
  ] as const;

  it('uses the wall-clock date of the device time zone', () => {
    const results = localDatesInZones(zoneCases.map(([zone, instant]) => [zone, instant]));
    expect(results).toEqual(zoneCases.map(([, , expected]) => expected));
  });

  it('matches the local getters of the instant in this process', () => {
    const instant = new Date('2026-06-15T12:00:00Z');
    expect(localDateOf(instant)).toBe(
      fromParts(instant.getFullYear(), instant.getMonth() + 1, instant.getDate()),
    );
    expect(today(instant)).toBe(localDateOf(instant));
  });

  it('today() uses the current clock', () => {
    expect(isCalendarDate(today())).toBe(true);
  });

  it('rejects invalid instants', () => {
    expect(() => localDateOf(new Date(NaN))).toThrow(InvalidCalendarDateError);
    expect(() => localDateOf('2026-01-01' as unknown as Date)).toThrow(InvalidCalendarDateError);
  });
});
