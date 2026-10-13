import { getCurrency, type CurrencyCode } from './currencies';
import { QUANTITY_SCALE, type Quantity } from './quantity';

/**
 * An exact amount in the minor units of one currency
 * (docs/project-specifications.md §8). Never a float.
 */
export type Money = {
  readonly minor: bigint;
  readonly currency: CurrencyCode;
};

/**
 * Largest magnitude a Money may hold. This is the SQLite 64-bit signed integer
 * range, made symmetric so that negating a valid amount is always valid.
 */
export const MAX_MINOR = 2n ** 63n - 1n;
export const MIN_MINOR = -MAX_MINOR;

export class MoneyRangeError extends Error {
  constructor() {
    super('Amount is outside the supported range');
    this.name = 'MoneyRangeError';
  }
}

export class CurrencyMismatchError extends Error {
  constructor(expected: string, received: string) {
    super(`Cannot combine ${expected} with ${received}`);
    this.name = 'CurrencyMismatchError';
  }
}

export class InvalidMoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMoneyError';
  }
}

/** Creates a Money, rejecting unknown currencies, non-integer and out-of-range amounts. */
export function money(minor: bigint, currency: string): Money {
  if (typeof minor !== 'bigint') {
    throw new InvalidMoneyError('Minor units must be a bigint');
  }
  if (minor > MAX_MINOR || minor < MIN_MINOR) {
    throw new MoneyRangeError();
  }
  return Object.freeze({ minor, currency: getCurrency(currency).code });
}

export function zero(currency: string): Money {
  return money(0n, currency);
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new CurrencyMismatchError(a.currency, b.currency);
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.minor + b.minor, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.minor - b.minor, a.currency);
}

export function negate(a: Money): Money {
  return money(-a.minor, a.currency);
}

export function abs(a: Money): Money {
  return a.minor < 0n ? negate(a) : a;
}

/** Sum of amounts in `currency`. An empty list sums to zero. */
export function sum(amounts: readonly Money[], currency: string): Money {
  let total = zero(currency);
  for (const amount of amounts) {
    total = add(total, amount);
  }
  return total;
}

/** Negative, zero or positive when `a` is less than, equal to or greater than `b`. */
export function compare(a: Money, b: Money): -1 | 0 | 1 {
  assertSameCurrency(a, b);
  return a.minor < b.minor ? -1 : a.minor > b.minor ? 1 : 0;
}

/** True only for the same currency and the same amount. Never throws. */
export function equals(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.minor === b.minor;
}

export function isZero(a: Money): boolean {
  return a.minor === 0n;
}

export function isPositive(a: Money): boolean {
  return a.minor > 0n;
}

export function isNegative(a: Money): boolean {
  return a.minor < 0n;
}

/**
 * Integer division rounded half away from zero (docs/adr/0003-rounding.md).
 * `denominator` must be positive.
 */
export function divideRoundHalfAwayFromZero(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) {
    throw new InvalidMoneyError('Denominator must be positive');
  }
  const magnitude = numerator < 0n ? -numerator : numerator;
  const quotient = magnitude / denominator;
  const rounded = (magnitude % denominator) * 2n >= denominator ? quotient + 1n : quotient;
  return numerator < 0n ? -rounded : rounded;
}

/**
 * Unit amount × quantity, rounded half away from zero to the currency's minor
 * unit (docs/adr/0003-rounding.md). Used for invoice lines.
 */
export function multiplyByQuantity(unitAmount: Money, quantity: Quantity): Money {
  return money(
    divideRoundHalfAwayFromZero(unitAmount.minor * quantity.thousandths, QUANTITY_SCALE),
    unitAmount.currency,
  );
}
