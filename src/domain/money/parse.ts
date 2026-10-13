import { getCurrency } from './currencies';
import { getLocaleSymbols } from './locale-symbols';
import { MAX_MINOR, money, type Money } from './money';

export type MoneyParseFailure = 'empty' | 'invalid' | 'too-many-decimals' | 'out-of-range';

export class MoneyParseError extends Error {
  constructor(readonly reason: MoneyParseFailure) {
    super(`Cannot read amount: ${reason}`);
    this.name = 'MoneyParseError';
  }
}

// Invisible direction marks that formatted numbers may carry.
const bidiMarks = /[؜‎‏‪-‮⁦-⁩]/g;
const whitespace = /\s/g;
const minusSigns = ['-', '−', '‒', '–'];

// Zero digits of scripts people may type or paste regardless of the app locale.
const digitZeros = [0x0660, 0x06f0, 0x0966, 0x09e6, 0xff10];

// Separators typed on a Latin keyboard in locales whose own separators are not on it.
const typedAlternatives: Readonly<Record<string, string>> = {
  '٫': '.', // Arabic decimal separator
  '٬': ',', // Arabic thousands separator
  '’': "'", // Swiss grouping apostrophe, in either form
  "'": '’',
};

function toAsciiDigits(text: string, localDigits: readonly string[]): string {
  return Array.from(text, (char) => {
    const local = localDigits.indexOf(char);
    if (local >= 0) {
      return String(local);
    }
    const point = char.codePointAt(0) ?? 0;
    const zero = digitZeros.find((start) => point >= start && point <= start + 9);
    return zero === undefined ? char : String(point - zero);
  }).join('');
}

function currencyLabels(locale: string, currency: string): string[] {
  const labels = new Set<string>([currency]);
  for (const currencyDisplay of ['symbol', 'narrowSymbol', 'code'] as const) {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay,
    }).formatToParts(1);
    for (const part of parts) {
      if (part.type === 'currency') {
        labels.add(part.value.replace(bidiMarks, '').replace(whitespace, ''));
      }
    }
  }
  return [...labels].filter(Boolean).sort((a, b) => b.length - a.length);
}

/** Groups must be thousands (1,234,567) or the Indian pattern (12,34,567). */
function isValidGrouping(groups: readonly string[]): boolean {
  const [first = '', ...rest] = groups;
  const last = rest[rest.length - 1];
  const middle = rest.slice(0, -1);
  if (first.length === 0 || last?.length !== 3) {
    return false;
  }
  const size = middle[0]?.length ?? 3;
  return (
    (size === 2 || size === 3) && middle.every((g) => g.length === size) && first.length <= size
  );
}

/**
 * Reads an amount typed or pasted by a user in `locale`.
 *
 * Strict by design: a separator in the wrong place, or more decimals than the
 * currency has, is an error and is never guessed or rounded. Accepts the
 * locale's own digits and separators, an optional sign and currency label.
 */
export function parseMoney(input: string, currency: string, locale: string): Money {
  const { code, exponent } = getCurrency(currency);
  const symbols = getLocaleSymbols(locale);
  if (typeof input !== 'string') {
    throw new MoneyParseError('invalid');
  }

  let text = input.replace(bidiMarks, '').replace(whitespace, '');
  for (const label of currencyLabels(locale, code)) {
    text = text.split(label).join('');
  }
  if (text === '') {
    throw new MoneyParseError('empty');
  }

  let negative = false;
  const signs = [...minusSigns, symbols.minusSign];
  if (signs.includes(text.charAt(0)) || text.startsWith('+')) {
    negative = text.charAt(0) !== '+';
    text = text.slice(1);
  } else if (signs.includes(text.charAt(text.length - 1))) {
    negative = true;
    text = text.slice(0, -1);
  }

  const separators = (symbol: string) =>
    [symbol, typedAlternatives[symbol]].filter(
      (s): s is string => Boolean(s) && !/\s/.test(s ?? ''),
    );
  const decimals = separators(symbols.decimal);
  const groups = separators(symbols.group).filter((s) => !decimals.includes(s));

  text = toAsciiDigits(text, symbols.digits);
  const chars = Array.from(text);
  const decimalAt = chars.findIndex((char) => decimals.includes(char));
  const wholeText = (decimalAt < 0 ? chars : chars.slice(0, decimalAt)).join('');
  const fraction = decimalAt < 0 ? '' : chars.slice(decimalAt + 1).join('');

  const groupChar = groups.find((g) => wholeText.includes(g));
  const wholeGroups = groupChar ? wholeText.split(groupChar) : [wholeText];
  const whole = wholeGroups.join('');

  if (
    !/^\d*$/.test(whole) ||
    !/^\d*$/.test(fraction) ||
    whole.length + fraction.length === 0 ||
    (groupChar !== undefined && !isValidGrouping(wholeGroups))
  ) {
    throw new MoneyParseError('invalid');
  }
  if (fraction.length > exponent) {
    throw new MoneyParseError('too-many-decimals');
  }

  const magnitude = BigInt((whole || '0') + fraction.padEnd(exponent, '0'));
  if (magnitude > MAX_MINOR) {
    throw new MoneyParseError('out-of-range');
  }
  return money(negative ? -magnitude : magnitude, code);
}
