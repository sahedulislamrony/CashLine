import * as fc from 'fast-check';

import {
  instant,
  instantFromDate,
  instantFromIsoString,
  InvalidInstantError,
  isInstant,
  MAX_INSTANT,
  toIsoString,
} from './instant';

describe('instant', () => {
  it.each([0, 1, 1760400000000, MAX_INSTANT])('accepts %p', (value) => {
    expect(isInstant(value)).toBe(true);
    expect(instant(value)).toBe(value);
  });

  it.each([-1, 1.5, NaN, Infinity, MAX_INSTANT + 1, '0', null, undefined, 10n])(
    'rejects %p',
    (value) => {
      expect(isInstant(value)).toBe(false);
      expect(() => instant(value as number)).toThrow(InvalidInstantError);
    },
  );

  it('converts from Date', () => {
    expect(instantFromDate(new Date('2026-10-14T08:30:00.123Z'))).toBe(1791966600123);
    expect(() => instantFromDate(new Date(NaN))).toThrow(InvalidInstantError);
    expect(() => instantFromDate('2026-10-14' as unknown as Date)).toThrow(InvalidInstantError);
  });

  it('writes UTC ISO text', () => {
    expect(toIsoString(instant(0))).toBe('1970-01-01T00:00:00.000Z');
    expect(toIsoString(instant(1791966600123))).toBe('2026-10-14T08:30:00.123Z');
    expect(toIsoString(instant(MAX_INSTANT))).toBe('9999-12-31T23:59:59.999Z');
  });

  it.each([
    '2026-10-14T08:30:00Z', // no milliseconds
    '2026-10-14T08:30:00.123+06:00', // offset
    '2026-10-14T08:30:00.123', // local time
    '2026-10-14 08:30:00.123Z',
    '2026-10-14',
    '2026-02-30T00:00:00.000Z', // impossible date
    '2026-13-01T00:00:00.000Z',
    '2026-10-14T24:00:00.000Z',
    '1969-12-31T23:59:59.999Z', // before the epoch
    '',
    'now',
  ])('rejects ISO text %p', (text) => {
    expect(() => instantFromIsoString(text)).toThrow(InvalidInstantError);
  });

  it('rejects non-string ISO input', () => {
    expect(() => instantFromIsoString(0 as unknown as string)).toThrow(InvalidInstantError);
  });

  it('round-trips through ISO text and keeps order', () => {
    const anyInstant = fc.integer({ min: 0, max: MAX_INSTANT });
    fc.assert(
      fc.property(anyInstant, anyInstant, (a, b) => {
        expect(instantFromIsoString(toIsoString(instant(a)))).toBe(a);
        expect(toIsoString(instant(a)) < toIsoString(instant(b))).toBe(a < b);
      }),
    );
  });
});
