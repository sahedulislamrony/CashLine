import * as fc from 'fast-check';

import { currencies, getCurrency } from './currencies';
import { toDecimalString } from './decimal-string';
import { formatMoney } from './format';
import { getLocaleSymbols } from './locale-symbols';
import { MAX_MINOR, MIN_MINOR, money } from './money';

const locales = [
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
];

describe('getLocaleSymbols', () => {
  it.each([
    ['en-US', '.', ','],
    ['de-DE', ',', '.'],
    ['ar-EG', '٫', '٬'],
  ])('%s uses decimal %p and group %p', (locale, decimal, group) => {
    expect(getLocaleSymbols(locale)).toMatchObject({ decimal, group });
  });

  it('reads the Swiss apostrophe, whichever form the runtime uses', () => {
    expect(["'", '’']).toContain(getLocaleSymbols('de-CH').group);
  });

  it('returns the locale digits and caches the result', () => {
    expect(getLocaleSymbols('en-US').digits.join('')).toBe('0123456789');
    expect(getLocaleSymbols('ar-EG').digits.join('')).toBe('٠١٢٣٤٥٦٧٨٩');
    expect(getLocaleSymbols('bn-BD').digits.join('')).toBe('০১২৩৪৫৬৭৮৯');
    expect(getLocaleSymbols('fr-FR')).toBe(getLocaleSymbols('fr-FR'));
  });
});

describe('formatMoney', () => {
  it.each([
    ['en-US', 'USD', 123456789n, '$1,234,567.89'],
    ['en-US', 'USD', -123456789n, '-$1,234,567.89'],
    ['en-US', 'USD', 5n, '$0.05'],
    ['en-US', 'USD', 0n, '$0.00'],
    ['en-US', 'USD', 100n, '$1.00'],
    ['en-US', 'JPY', 1500n, '¥1,500'],
    ['en-US', 'KWD', 1234567n, 'KWD 1,234.567'],
    ['de-DE', 'EUR', 123456789n, '1.234.567,89 €'],
    ['de-DE', 'EUR', -5n, '-0,05 €'],
    ['en-IN', 'INR', 123456789n, '₹12,34,567.89'],
    ['ja-JP', 'JPY', 1234567n, '￥1,234,567'],
    ['es-ES', 'EUR', 123456n, '1234,56 €'],
    ['es-ES', 'EUR', 1234567n, '12.345,67 €'],
  ])('%s %s %p → %s', (locale, currency, minor, expected) => {
    expect(formatMoney(money(minor, currency), locale)).toBe(expected);
  });

  it('always shows the ISO decimals, even where Intl would default to none', () => {
    // CLDR formats these with 0 decimals; ISO 4217 defines 2 and 3 (memory.md D-17).
    expect(formatMoney(money(150050n, 'PKR'), 'en-US')).toBe('PKR 1,500.50');
    expect(formatMoney(money(150050n, 'IDR'), 'en-US')).toBe('IDR 1,500.50');
    expect(formatMoney(money(1500500n, 'IQD'), 'en-US')).toBe('IQD 1,500.500');
    expect(formatMoney(money(150050n, 'HUF'), 'en-US')).toBe('HUF 1,500.50');
  });

  it('uses the locale digits', () => {
    expect(formatMoney(money(123456n, 'EGP'), 'ar-EG')).toContain('١٬٢٣٤٫٥٦');
    expect(formatMoney(money(123456n, 'BDT'), 'bn-BD')).toContain('১,২৩৪.৫৬');
  });

  it('supports code and narrow-symbol display', () => {
    const amount = money(123450n, 'USD');
    expect(formatMoney(amount, 'en-US', { currencyDisplay: 'code' })).toBe('USD 1,234.50');
    expect(formatMoney(amount, 'en-CA', { currencyDisplay: 'symbol' })).toBe('US$1,234.50');
    expect(formatMoney(amount, 'en-CA', { currencyDisplay: 'narrowSymbol' })).toBe('$1,234.50');
  });

  it('shows an explicit plus sign on request, but not on zero', () => {
    expect(formatMoney(money(500n, 'USD'), 'en-US', { signDisplay: 'exceptZero' })).toBe('+$5.00');
    expect(formatMoney(money(-500n, 'USD'), 'en-US', { signDisplay: 'exceptZero' })).toBe('-$5.00');
    expect(formatMoney(money(0n, 'USD'), 'en-US', { signDisplay: 'exceptZero' })).toBe('$0.00');
  });

  it('is exact at the limits of the range, beyond what a double can hold', () => {
    expect(formatMoney(money(MAX_MINOR, 'USD'), 'en-US')).toBe('$92,233,720,368,547,758.07');
    expect(formatMoney(money(MIN_MINOR, 'USD'), 'en-US')).toBe('-$92,233,720,368,547,758.07');
    expect(formatMoney(money(MAX_MINOR, 'JPY'), 'en-US')).toBe('¥9,223,372,036,854,775,807');
    expect(formatMoney(money(9007199254740993n, 'JPY'), 'en-US')).toBe('¥9,007,199,254,740,993');
  });

  it('matches exact Intl formatting for every currency, locale and amount', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...locales),
        fc.constantFrom(...currencies.map((c) => c.code)),
        fc.oneof(
          fc.bigInt({ min: MIN_MINOR, max: MAX_MINOR }),
          fc.bigInt({ min: -1_000_000n, max: 1_000_000n }),
        ),
        fc.constantFrom('symbol', 'narrowSymbol', 'code'),
        fc.constantFrom('auto', 'exceptZero'),
        (locale, currency, minor, currencyDisplay, signDisplay) => {
          const amount = money(minor, currency);
          const { exponent } = getCurrency(currency);
          // V8 formats decimal strings exactly, which makes Intl a trustworthy oracle here.
          const oracle = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            currencyDisplay,
            signDisplay,
            minimumFractionDigits: exponent,
            maximumFractionDigits: exponent,
          }).format(toDecimalString(amount) as unknown as number);
          expect(formatMoney(amount, locale, { currencyDisplay, signDisplay })).toBe(oracle);
        },
      ),
      { numRuns: 2000 },
    );
  });
});
