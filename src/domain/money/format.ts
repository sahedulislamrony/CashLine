import { getCurrency } from './currencies';
import { getLocaleSymbols } from './locale-symbols';
import type { Money } from './money';

export type FormatMoneyOptions = {
  /** "symbol" ($), "narrowSymbol" or the ISO "code" (USD). Default "symbol". */
  readonly currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code';
  /** "auto" signs only negatives; "exceptZero" also shows + on positives. Default "auto". */
  readonly signDisplay?: 'auto' | 'exceptZero';
};

/**
 * Formats an amount for display in `locale`, always with exactly the
 * currency's ISO 4217 decimals (docs/memory.md D-17).
 *
 * Intl supplies only the layout: symbol position, separators, grouping and
 * sign. It is given a placeholder with the same number of integer digits, and
 * the real digits are then written in from exact integer arithmetic, so amounts
 * beyond 2^53 are never rounded through a float.
 */
export function formatMoney(
  amount: Money,
  locale: string,
  options: FormatMoneyOptions = {},
): string {
  const { exponent } = getCurrency(amount.currency);
  const negative = amount.minor < 0n;
  const digits = (negative ? -amount.minor : amount.minor).toString().padStart(exponent + 1, '0');
  const whole = digits.slice(0, digits.length - exponent);
  const fraction = digits.slice(digits.length - exponent);

  // 10^(n-1) has n integer digits and is exact as a double for every n in range.
  const placeholder = amount.minor === 0n ? 0 : (negative ? -1 : 1) * 10 ** (whole.length - 1);
  const parts = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: amount.currency,
    currencyDisplay: options.currencyDisplay ?? 'symbol',
    signDisplay: options.signDisplay ?? 'auto',
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).formatToParts(placeholder);

  const localDigits = getLocaleSymbols(locale).digits;
  const localize = (ascii: string) =>
    Array.from(ascii, (digit) => localDigits[Number(digit)] ?? digit).join('');

  let consumed = 0;
  return parts
    .map((part) => {
      if (part.type === 'integer') {
        const length = Array.from(part.value).length;
        const slice = whole.slice(consumed, consumed + length);
        consumed += length;
        return localize(slice);
      }
      return part.type === 'fraction' ? localize(fraction) : part.value;
    })
    .join('');
}
