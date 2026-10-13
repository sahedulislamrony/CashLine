import * as fc from 'fast-check';

import { currencies, UnknownCurrencyError } from './currencies';
import {
  abs,
  add,
  compare,
  CurrencyMismatchError,
  divideRoundHalfAwayFromZero,
  equals,
  InvalidMoneyError,
  isNegative,
  isPositive,
  isZero,
  MAX_MINOR,
  MIN_MINOR,
  money,
  MoneyRangeError,
  multiplyByQuantity,
  negate,
  subtract,
  sum,
  zero,
} from './money';
import { MAX_QUANTITY_THOUSANDTHS, quantity } from './quantity';

const usd = (minor: bigint) => money(minor, 'USD');

// Arbitraries. Amounts stay within a third of the range so sums of three cannot overflow.
const anyCurrency = fc.constantFrom(...currencies.map((c) => c.code));
const safeMinor = fc.bigInt({ min: MIN_MINOR / 3n, max: MAX_MINOR / 3n });
const anyMinor = fc.bigInt({ min: MIN_MINOR, max: MAX_MINOR });

describe('money()', () => {
  it('creates a frozen value', () => {
    const m = usd(1050n);
    expect(m).toEqual({ minor: 1050n, currency: 'USD' });
    expect(Object.isFrozen(m)).toBe(true);
  });

  it('accepts the bounds of the range', () => {
    expect(usd(MAX_MINOR).minor).toBe(2n ** 63n - 1n);
    expect(usd(MIN_MINOR).minor).toBe(-(2n ** 63n - 1n));
  });

  it.each([MAX_MINOR + 1n, MIN_MINOR - 1n, -(2n ** 63n), 2n ** 64n])(
    'rejects out-of-range %p',
    (minor) => {
      expect(() => usd(minor)).toThrow(MoneyRangeError);
    },
  );

  it.each([10.5, 10, '10', null, undefined, NaN])('rejects non-bigint %p', (minor) => {
    expect(() => money(minor as unknown as bigint, 'USD')).toThrow(InvalidMoneyError);
  });

  it.each(['usd', 'XXX', 'XAU', '', 'US'])('rejects currency %p', (currency) => {
    expect(() => money(1n, currency)).toThrow(UnknownCurrencyError);
  });

  it('zero() is zero in the given currency', () => {
    expect(zero('JPY')).toEqual({ minor: 0n, currency: 'JPY' });
  });
});

describe('add and subtract', () => {
  it('adds and subtracts minor units exactly', () => {
    expect(add(usd(10n), usd(20n))).toEqual(usd(30n));
    expect(subtract(usd(10n), usd(30n))).toEqual(usd(-20n));
  });

  it('has no floating-point drift: 0.10 + 0.20 is exactly 0.30', () => {
    expect(add(usd(10n), usd(20n)).minor).toBe(30n);
  });

  it('stays exact beyond Number.MAX_SAFE_INTEGER', () => {
    const big = BigInt(Number.MAX_SAFE_INTEGER);
    expect(add(usd(big), usd(2n)).minor).toBe(9007199254740993n);
  });

  it('rejects mixed currencies', () => {
    const eur = money(1n, 'EUR');
    expect(() => add(usd(1n), eur)).toThrow(CurrencyMismatchError);
    expect(() => subtract(usd(1n), eur)).toThrow(CurrencyMismatchError);
    expect(() => compare(usd(1n), eur)).toThrow('Cannot combine USD with EUR');
  });

  it('rejects overflow instead of wrapping', () => {
    expect(() => add(usd(MAX_MINOR), usd(1n))).toThrow(MoneyRangeError);
    expect(() => subtract(usd(MIN_MINOR), usd(1n))).toThrow(MoneyRangeError);
  });

  it('is commutative and associative, with zero as identity', () => {
    fc.assert(
      fc.property(anyCurrency, safeMinor, safeMinor, safeMinor, (currency, a, b, c) => {
        const [x, y, z] = [money(a, currency), money(b, currency), money(c, currency)];
        expect(add(x, y)).toEqual(add(y, x));
        expect(add(add(x, y), z)).toEqual(add(x, add(y, z)));
        expect(add(x, zero(currency))).toEqual(x);
      }),
    );
  });

  it('subtract undoes add, and a - a is zero', () => {
    fc.assert(
      fc.property(anyCurrency, safeMinor, safeMinor, (currency, a, b) => {
        const [x, y] = [money(a, currency), money(b, currency)];
        expect(subtract(add(x, y), y)).toEqual(x);
        expect(isZero(subtract(x, x))).toBe(true);
      }),
    );
  });

  it('either returns the exact result or rejects, across the whole range', () => {
    fc.assert(
      fc.property(anyMinor, anyMinor, (a, b) => {
        const exact = a + b;
        if (exact > MAX_MINOR || exact < MIN_MINOR) {
          expect(() => add(usd(a), usd(b))).toThrow(MoneyRangeError);
        } else {
          expect(add(usd(a), usd(b)).minor).toBe(exact);
        }
      }),
    );
  });
});

describe('negate, abs and sign checks', () => {
  it('negates and takes absolute values', () => {
    expect(negate(usd(5n))).toEqual(usd(-5n));
    expect(negate(usd(0n)).minor).toBe(0n);
    expect(abs(usd(-5n))).toEqual(usd(5n));
    expect(abs(usd(5n))).toEqual(usd(5n));
  });

  it('negation is always valid and is its own inverse', () => {
    fc.assert(
      fc.property(anyCurrency, anyMinor, (currency, a) => {
        const x = money(a, currency);
        expect(negate(negate(x))).toEqual(x);
        expect(add(x, negate(x)).minor).toBe(0n);
      }),
    );
  });

  it('reports the sign', () => {
    expect([isNegative(usd(-1n)), isZero(usd(-1n)), isPositive(usd(-1n))]).toEqual([
      true,
      false,
      false,
    ]);
    expect([isNegative(usd(0n)), isZero(usd(0n)), isPositive(usd(0n))]).toEqual([
      false,
      true,
      false,
    ]);
    expect([isNegative(usd(1n)), isZero(usd(1n)), isPositive(usd(1n))]).toEqual([
      false,
      false,
      true,
    ]);
  });
});

describe('compare and equals', () => {
  it('orders amounts', () => {
    expect(compare(usd(1n), usd(2n))).toBe(-1);
    expect(compare(usd(2n), usd(2n))).toBe(0);
    expect(compare(usd(3n), usd(2n))).toBe(1);
  });

  it('equals requires the same currency and amount and never throws', () => {
    expect(equals(usd(1n), usd(1n))).toBe(true);
    expect(equals(usd(1n), usd(2n))).toBe(false);
    expect(equals(usd(1n), money(1n, 'EUR'))).toBe(false);
  });

  it('compare agrees with bigint ordering', () => {
    fc.assert(
      fc.property(anyMinor, anyMinor, (a, b) => {
        expect(compare(usd(a), usd(b))).toBe(a < b ? -1 : a > b ? 1 : 0);
        expect(equals(usd(a), usd(b))).toBe(a === b);
      }),
    );
  });
});

describe('sum', () => {
  it('sums a list and returns zero for an empty list', () => {
    expect(sum([usd(1n), usd(2n), usd(-5n)], 'USD')).toEqual(usd(-2n));
    expect(sum([], 'KWD')).toEqual(zero('KWD'));
  });

  it('rejects an amount in another currency', () => {
    expect(() => sum([usd(1n), money(1n, 'EUR')], 'USD')).toThrow(CurrencyMismatchError);
    expect(() => sum([usd(1n)], 'EUR')).toThrow(CurrencyMismatchError);
  });

  it('does not depend on order', () => {
    fc.assert(
      fc.property(
        fc.array(fc.bigInt({ min: -(10n ** 15n), max: 10n ** 15n }), { maxLength: 30 }),
        (minors) => {
          const amounts = minors.map(usd);
          const expected = minors.reduce((a, b) => a + b, 0n);
          expect(sum(amounts, 'USD').minor).toBe(expected);
          expect(sum([...amounts].reverse(), 'USD').minor).toBe(expected);
        },
      ),
    );
  });
});

describe('divideRoundHalfAwayFromZero', () => {
  it.each([
    [0n, 1000n, 0n],
    [499n, 1000n, 0n],
    [500n, 1000n, 1n],
    [501n, 1000n, 1n],
    [1499n, 1000n, 1n],
    [1500n, 1000n, 2n],
    [2500n, 1000n, 3n],
    [-499n, 1000n, 0n],
    [-500n, 1000n, -1n],
    [-1500n, 1000n, -2n],
    [-2500n, 1000n, -3n],
    [7n, 2n, 4n],
    [-7n, 2n, -4n],
    [1n, 3n, 0n],
    [2n, 3n, 1n],
  ])('%p / %p rounds to %p', (numerator, denominator, expected) => {
    expect(divideRoundHalfAwayFromZero(numerator, denominator)).toBe(expected);
  });

  it.each([0n, -1n])('rejects denominator %p', (denominator) => {
    expect(() => divideRoundHalfAwayFromZero(1n, denominator)).toThrow(InvalidMoneyError);
  });

  it('is within half a unit of the exact value, is symmetric, and is exact when divisible', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: -(10n ** 30n), max: 10n ** 30n }),
        fc.bigInt({ min: 1n, max: 10n ** 6n }),
        (n, d) => {
          const q = divideRoundHalfAwayFromZero(n, d);
          const error = n - q * d;
          const magnitude = error < 0n ? -error : error;
          expect(magnitude * 2n <= d).toBe(true);
          // A tie (exactly half) must have moved away from zero.
          if (magnitude * 2n === d) {
            expect((q < 0n ? -q : q) * d > (n < 0n ? -n : n)).toBe(true);
          }
          expect(divideRoundHalfAwayFromZero(-n, d)).toBe(-q);
          expect(divideRoundHalfAwayFromZero(q * d, d)).toBe(q);
        },
      ),
    );
  });
});

describe('multiplyByQuantity', () => {
  it.each([
    // currency, unit minor, quantity, expected minor
    ['USD', 1000n, '1', 1000n],
    ['USD', 1000n, '0', 0n],
    ['USD', 1000n, '2.5', 2500n],
    ['USD', 999n, '1.5', 1499n], // 1498.5 → 1499
    ['USD', 333n, '0.5', 167n], // 166.5 → 167
    ['USD', 1n, '0.5', 1n], // 0.5 → 1
    ['USD', 1n, '0.499', 0n],
    ['USD', -333n, '0.5', -167n], // discount line: −166.5 → −167
    ['USD', 7500n, '7.25', 54375n],
    ['USD', 1999n, '0.333', 666n], // 665.667 → 666
    ['JPY', 1500n, '1.5', 2250n],
    ['JPY', 333n, '0.5', 167n],
    ['JPY', 1n, '0.001', 0n],
    ['KWD', 1234n, '0.5', 617n],
    ['KWD', 1235n, '0.5', 618n], // 617.5 → 618
    ['KWD', 12345n, '1.001', 12357n], // 12357.345 → 12357
    ['CLF', 12345n, '0.125', 1543n], // 1543.125 → 1543
  ])('%s %p × %s = %p', (currency, unit, qty, expected) => {
    expect(multiplyByQuantity(money(unit, currency), quantity(qty))).toEqual(
      money(expected, currency),
    );
  });

  it('rejects overflow', () => {
    expect(() => multiplyByQuantity(usd(MAX_MINOR), quantity('2'))).toThrow(MoneyRangeError);
  });

  it('whole quantities are exact, and the result is within half a minor unit', () => {
    fc.assert(
      fc.property(
        anyCurrency,
        // 10^9 minor units × 10^9 quantity stays inside the 64-bit range.
        fc.bigInt({ min: -(10n ** 9n), max: 10n ** 9n }),
        fc.bigInt({ min: 0n, max: MAX_QUANTITY_THOUSANDTHS / 1000n }),
        fc.bigInt({ min: 0n, max: 999n }),
        (currency, unit, whole, fraction) => {
          const unitAmount = money(unit, currency);
          expect(multiplyByQuantity(unitAmount, { thousandths: whole * 1000n }).minor).toBe(
            unit * whole,
          );
          const thousandths = whole * 1000n + fraction;
          const result = multiplyByQuantity(unitAmount, { thousandths }).minor;
          const error = unit * thousandths - result * 1000n;
          expect((error < 0n ? -error : error) * 2n <= 1000n).toBe(true);
          // Negating the unit amount negates the line: discounts mirror charges.
          expect(multiplyByQuantity(negate(unitAmount), { thousandths }).minor).toBe(-result);
        },
      ),
    );
  });
});
