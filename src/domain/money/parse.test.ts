import * as fc from 'fast-check';

import { currencies } from './currencies';
import { formatMoney } from './format';
import { MAX_MINOR, MIN_MINOR, money } from './money';
import { MoneyParseError, parseMoney, type MoneyParseFailure } from './parse';

function failure(input: string, currency: string, locale: string): MoneyParseFailure | 'no error' {
  try {
    parseMoney(input, currency, locale);
    return 'no error';
  } catch (error) {
    if (error instanceof MoneyParseError) {
      return error.reason;
    }
    throw error;
  }
}

describe('parseMoney', () => {
  it.each([
    // locale, currency, input, minor
    ['en-US', 'USD', '12', 1200n],
    ['en-US', 'USD', '12.5', 1250n],
    ['en-US', 'USD', '12.50', 1250n],
    ['en-US', 'USD', '0.05', 5n],
    ['en-US', 'USD', '.5', 50n],
    ['en-US', 'USD', '12.', 1200n],
    ['en-US', 'USD', '007', 700n],
    ['en-US', 'USD', '1,234.50', 123450n],
    ['en-US', 'USD', '1,234,567.89', 123456789n],
    ['en-US', 'USD', '1234567.89', 123456789n],
    ['en-US', 'USD', ' 12.50 ', 1250n],
    ['en-US', 'USD', '$12.50', 1250n],
    ['en-US', 'USD', 'USD 12.50', 1250n],
    ['en-US', 'USD', '12.50 USD', 1250n],
    ['en-US', 'USD', '-12.50', -1250n],
    ['en-US', 'USD', '−12.50', -1250n],
    ['en-US', 'USD', '-$12.50', -1250n],
    ['en-US', 'USD', '$-12.50', -1250n],
    ['en-US', 'USD', '12.50-', -1250n],
    ['en-US', 'USD', '+12.50', 1250n],
    ['en-US', 'USD', '-0', 0n],
    ['en-US', 'JPY', '1500', 1500n],
    ['en-US', 'JPY', '1,500', 1500n],
    ['en-US', 'KWD', '1.5', 1500n],
    ['en-US', 'KWD', '1.234', 1234n],
    ['en-IN', 'INR', '12,34,567.89', 123456789n],
    ['en-IN', 'INR', '1,234,567.89', 123456789n],
    ['de-DE', 'EUR', '12,5', 1250n],
    ['de-DE', 'EUR', '1.234,50', 123450n],
    ['de-DE', 'EUR', '1.234', 123400n],
    ['de-DE', 'EUR', '1.234,50 €', 123450n],
    ['fr-FR', 'EUR', '1 234,50', 123450n],
    ['fr-FR', 'EUR', '1 234,50 €', 123450n],
    ['de-CH', 'CHF', "1'234.50", 123450n],
    ['de-CH', 'CHF', '1’234.50', 123450n],
    ['ar-EG', 'EGP', '١٬٢٣٤٫٥٠', 123450n],
    ['ar-EG', 'EGP', '1,234.50', 123450n],
    ['ar-EG', 'EGP', '١٢٫٥', 1250n],
    ['fa-IR', 'IRR', '۱۲٫۵', 1250n],
    ['bn-BD', 'BDT', '১২.৫০', 1250n],
    ['en-US', 'BDT', '১২.৫০', 1250n],
    ['en-US', 'USD', '１２.５', 1250n],
  ])('%s %s %p → %p', (locale, currency, input, minor) => {
    expect(parseMoney(input, currency, locale)).toEqual(money(minor, currency));
  });

  it.each([
    ['en-US', 'USD', '', 'empty'],
    ['en-US', 'USD', '   ', 'empty'],
    ['en-US', 'USD', '$', 'empty'],
    ['en-US', 'USD', '-', 'invalid'],
    ['en-US', 'USD', '.', 'invalid'],
    ['en-US', 'USD', 'abc', 'invalid'],
    ['en-US', 'USD', '12abc', 'invalid'],
    ['en-US', 'USD', '1.2.3', 'invalid'],
    ['en-US', 'USD', '--5', 'invalid'],
    ['en-US', 'USD', '-5-', 'invalid'],
    ['en-US', 'USD', '5+', 'invalid'],
    ['en-US', 'USD', '1e3', 'invalid'],
    ['en-US', 'USD', '(5.00)', 'invalid'],
    ['en-US', 'USD', '€5', 'invalid'],
    // A comma is a thousands separator in en-US: these are not "1.5" and must not be guessed.
    ['en-US', 'USD', '1,5', 'invalid'],
    ['en-US', 'USD', '1,50', 'invalid'],
    ['en-US', 'USD', '12,34', 'invalid'],
    ['en-US', 'USD', ',500', 'invalid'],
    ['en-US', 'USD', '1,,500', 'invalid'],
    ['en-US', 'USD', '1,2345', 'invalid'],
    ['en-US', 'USD', '1234,567', 'invalid'],
    ['en-US', 'USD', '1.5,000', 'invalid'],
    // A point is a thousands separator in de-DE.
    ['de-DE', 'EUR', '1.5', 'invalid'],
    ['de-DE', 'EUR', '1,234.50', 'invalid'],
    ['en-US', 'USD', '1.234', 'too-many-decimals'],
    ['en-US', 'USD', '0.001', 'too-many-decimals'],
    ['en-US', 'JPY', '1.5', 'too-many-decimals'],
    ['en-US', 'JPY', '1.0', 'too-many-decimals'],
    ['en-US', 'KWD', '1.2345', 'too-many-decimals'],
    ['en-US', 'USD', '92233720368547758.08', 'out-of-range'],
    ['en-US', 'USD', '9'.repeat(40), 'out-of-range'],
  ])('%s %s rejects %p as %s', (locale, currency, input, reason) => {
    expect(failure(input, currency, locale)).toBe(reason);
  });

  it('rejects non-string input', () => {
    expect(failure(12.5 as unknown as string, 'USD', 'en-US')).toBe('invalid');
  });

  it('accepts the limits of the range', () => {
    expect(parseMoney('92233720368547758.07', 'USD', 'en-US').minor).toBe(MAX_MINOR);
    expect(parseMoney('-92233720368547758.07', 'USD', 'en-US').minor).toBe(MIN_MINOR);
  });

  it('reads back everything formatMoney writes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'en-US',
          'en-GB',
          'en-IN',
          'de-DE',
          'de-CH',
          'fr-FR',
          'es-ES',
          'pt-BR',
          'nl-NL',
          'sv-SE',
          'ja-JP',
          'ar-EG',
          'ar-SA',
          'he-IL',
          'fa-IR',
          'bn-BD',
          'hi-IN',
        ),
        fc.constantFrom(...currencies.map((c) => c.code)),
        fc.oneof(
          fc.bigInt({ min: MIN_MINOR, max: MAX_MINOR }),
          fc.bigInt({ min: -1_000_000n, max: 1_000_000n }),
        ),
        fc.constantFrom('symbol', 'narrowSymbol', 'code'),
        (locale, currency, minor, currencyDisplay) => {
          const amount = money(minor, currency);
          const text = formatMoney(amount, locale, { currencyDisplay });
          expect(parseMoney(text, currency, locale)).toEqual(amount);
        },
      ),
      { numRuns: 2000 },
    );
  });

  it('never returns a wrong amount for arbitrary text: it parses exactly or throws', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 12 }), (input) => {
        try {
          const result = parseMoney(input, 'USD', 'en-US');
          expect(typeof result.minor).toBe('bigint');
        } catch (error) {
          expect(error).toBeInstanceOf(MoneyParseError);
        }
      }),
      { numRuns: 1000 },
    );
  });
});
