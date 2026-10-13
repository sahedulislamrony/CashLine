import { getCurrency } from './currencies';
import { money, type Money } from './money';

/**
 * Canonical, locale-free decimal text for an amount: "-1234.50", "1500", "0.125".
 * Always shows exactly the currency's decimals. Used for CSV, backups and as the
 * exact input to locale formatting; never shown to users directly.
 */
export function toDecimalString(amount: Money): string {
  const { exponent } = getCurrency(amount.currency);
  const negative = amount.minor < 0n;
  const digits = (negative ? -amount.minor : amount.minor).toString().padStart(exponent + 1, '0');
  const whole = digits.slice(0, digits.length - exponent);
  const fraction = digits.slice(digits.length - exponent);
  return `${negative ? '-' : ''}${whole}${exponent > 0 ? `.${fraction}` : ''}`;
}

export class InvalidDecimalStringError extends Error {
  constructor() {
    super('Not a canonical decimal amount for this currency');
    this.name = 'InvalidDecimalStringError';
  }
}

const pattern = /^(-?)(\d+)(?:\.(\d+))?$/;

/**
 * Parses canonical decimal text ("-1234.5", "1500"). ASCII digits, "." as the
 * decimal separator, no grouping. More decimals than the currency has is an
 * error, never rounded. For text typed by a user, use `parseMoney`.
 */
export function fromDecimalString(text: string, currency: string): Money {
  const { code, exponent } = getCurrency(currency);
  const match = typeof text === 'string' ? pattern.exec(text) : null;
  const [, sign = '', whole = '', fraction = ''] = match ?? [];
  if (!match || fraction.length > exponent) {
    throw new InvalidDecimalStringError();
  }
  const magnitude = BigInt(whole + fraction.padEnd(exponent, '0'));
  return money(sign ? -magnitude : magnitude, code);
}
