import * as fc from 'fast-check';

import { currencies } from './currencies';
import { fromDecimalString, InvalidDecimalStringError, toDecimalString } from './decimal-string';
import { MAX_MINOR, MIN_MINOR, money, MoneyRangeError } from './money';

describe('toDecimalString', () => {
  it.each([
    ['USD', 123450n, '1234.50'],
    ['USD', 5n, '0.05'],
    ['USD', 0n, '0.00'],
    ['USD', -5n, '-0.05'],
    ['USD', -123450n, '-1234.50'],
    ['JPY', 1500n, '1500'],
    ['JPY', 0n, '0'],
    ['JPY', -1n, '-1'],
    ['KWD', 1n, '0.001'],
    ['KWD', 1234567n, '1234.567'],
    ['CLF', 12345n, '1.2345'],
    ['USD', MAX_MINOR, '92233720368547758.07'],
    ['USD', MIN_MINOR, '-92233720368547758.07'],
  ])('%s %p → %s', (currency, minor, text) => {
    expect(toDecimalString(money(minor, currency))).toBe(text);
  });
});

describe('fromDecimalString', () => {
  it.each([
    ['USD', '1234.50', 123450n],
    ['USD', '1234.5', 123450n],
    ['USD', '1234', 123400n],
    ['USD', '-0.05', -5n],
    ['USD', '-0', 0n],
    ['USD', '007.10', 710n],
    ['JPY', '1500', 1500n],
    ['KWD', '0.001', 1n],
    ['KWD', '1.5', 1500n],
  ])('%s %s → %p', (currency, text, minor) => {
    expect(fromDecimalString(text, currency)).toEqual(money(minor, currency));
  });

  it.each([
    ['USD', ''],
    ['USD', ' 1'],
    ['USD', '1 '],
    ['USD', '+1'],
    ['USD', '1.'],
    ['USD', '.5'],
    ['USD', '1,5'],
    ['USD', '1,000.00'],
    ['USD', '1.234'],
    ['USD', '1e3'],
    ['USD', '--1'],
    ['USD', '1.2.3'],
    ['USD', '١٢'],
    ['USD', 'abc'],
    ['JPY', '1.0'],
    ['KWD', '1.2345'],
  ])('rejects %s %p', (currency, text) => {
    expect(() => fromDecimalString(text, currency)).toThrow(InvalidDecimalStringError);
  });

  it('rejects non-string input and out-of-range amounts', () => {
    expect(() => fromDecimalString(12 as unknown as string, 'USD')).toThrow(
      InvalidDecimalStringError,
    );
    expect(() => fromDecimalString('92233720368547758.08', 'USD')).toThrow(MoneyRangeError);
  });

  it('round-trips every amount in every currency', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...currencies.map((c) => c.code)),
        fc.bigInt({ min: MIN_MINOR, max: MAX_MINOR }),
        (currency, minor) => {
          const amount = money(minor, currency);
          expect(fromDecimalString(toDecimalString(amount), currency)).toEqual(amount);
        },
      ),
    );
  });
});
