import {
  CURRENCY_TABLE_VERSION,
  UnknownCurrencyError,
  currencies,
  findCurrency,
  getCurrency,
  isCurrencyCode,
} from './currencies';

describe('currency table', () => {
  it('has a positive integer version', () => {
    expect(Number.isInteger(CURRENCY_TABLE_VERSION)).toBe(true);
    expect(CURRENCY_TABLE_VERSION).toBeGreaterThan(0);
  });

  it('contains every ISO 4217 code that has a minor unit', () => {
    expect(currencies).toHaveLength(165);
  });

  it('has no duplicate codes and is sorted by code', () => {
    const codes = currencies.map((currency) => currency.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toEqual([...codes].sort());
  });

  it('uses three uppercase letters, a non-empty name and an exponent from 0 to 4', () => {
    for (const currency of currencies) {
      expect(currency.code).toMatch(/^[A-Z]{3}$/);
      expect(currency.name.trim()).toBe(currency.name);
      expect(currency.name.length).toBeGreaterThan(0);
      expect([0, 2, 3, 4]).toContain(currency.exponent);
    }
  });

  it('is frozen so callers cannot change it', () => {
    expect(Object.isFrozen(currencies)).toBe(true);
    expect(Object.isFrozen(getCurrency('USD'))).toBe(true);
  });
});

describe('minor-unit exponents', () => {
  it.each([
    ['JPY', 0],
    ['KRW', 0],
    ['VND', 0],
    ['ISK', 0],
    ['XOF', 0],
    ['USD', 2],
    ['EUR', 2],
    ['GBP', 2],
    ['BDT', 2],
    ['INR', 2],
    ['KWD', 3],
    ['BHD', 3],
    ['JOD', 3],
    ['OMR', 3],
    ['TND', 3],
    ['CLF', 4],
    ['UYW', 4],
  ])('%s has exponent %d', (code, exponent) => {
    expect(getCurrency(code).exponent).toBe(exponent);
  });

  it('has exactly the expected zero-decimal currencies', () => {
    const zero = currencies.filter((c) => c.exponent === 0).map((c) => c.code);
    expect(zero).toEqual([
      'BIF',
      'CLP',
      'DJF',
      'GNF',
      'ISK',
      'JPY',
      'KMF',
      'KRW',
      'PYG',
      'RWF',
      'UGX',
      'UYI',
      'VND',
      'VUV',
      'XAF',
      'XOF',
      'XPF',
    ]);
  });

  it('has exactly the expected three-decimal currencies', () => {
    const three = currencies.filter((c) => c.exponent === 3).map((c) => c.code);
    expect(three).toEqual(['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND']);
  });
});

describe('lookup', () => {
  it('returns the currency for a known code', () => {
    expect(getCurrency('USD')).toEqual({ code: 'USD', name: 'US Dollar', exponent: 2 });
    expect(findCurrency('JPY')).toEqual({ code: 'JPY', name: 'Yen', exponent: 0 });
  });

  it('includes recently added codes and excludes withdrawn ones', () => {
    expect(isCurrencyCode('XCG')).toBe(true);
    expect(isCurrencyCode('ZWG')).toBe(true);
    expect(isCurrencyCode('SLE')).toBe(true);
    for (const withdrawn of ['ANG', 'BGN', 'HRK', 'SLL', 'ZWL', 'CUC']) {
      expect(isCurrencyCode(withdrawn)).toBe(false);
    }
  });

  it.each(['XAU', 'XAG', 'XPT', 'XPD', 'XDR', 'XTS', 'XXX', 'XBA', 'XSU', 'XUA'])(
    'excludes %s, which has no minor unit',
    (code) => {
      expect(isCurrencyCode(code)).toBe(false);
    },
  );

  it.each([
    'usd',
    'Usd',
    ' USD',
    'USD ',
    'US',
    'USDD',
    '',
    'U$D',
    '840',
    'ÜSD',
    'ABC',
    'toString',
    'constructor',
    '__proto__',
  ])('rejects malformed or unknown code %p', (code) => {
    expect(isCurrencyCode(code)).toBe(false);
    expect(findCurrency(code)).toBeUndefined();
    expect(() => getCurrency(code)).toThrow(UnknownCurrencyError);
  });

  it.each([undefined, null, 840, {}, ['USD']])('rejects non-string value %p', (value) => {
    expect(isCurrencyCode(value)).toBe(false);
  });

  it('reports the rejected code without echoing long input', () => {
    expect(() => getCurrency('ABC')).toThrow('Unknown currency code: "ABC"');
    const long = 'A'.repeat(500);
    try {
      getCurrency(long);
      throw new Error('expected getCurrency to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(UnknownCurrencyError);
      expect((error as Error).message.length).toBeLessThan(80);
    }
  });
});
