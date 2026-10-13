/**
 * Number conventions of a locale, read once from the runtime's Intl data.
 * Only symbols come from Intl; every digit of an amount is produced by exact
 * integer code in format.ts and parse.ts.
 */
export type LocaleSymbols = {
  readonly decimal: string;
  readonly group: string;
  readonly minusSign: string;
  /** The locale's digits for 0–9, for example "0123456789" or "٠١٢٣٤٥٦٧٨٩". */
  readonly digits: readonly string[];
};

const cache = new Map<string, LocaleSymbols>();

export function getLocaleSymbols(locale: string): LocaleSymbols {
  const cached = cache.get(locale);
  if (cached) {
    return cached;
  }
  const parts = new Intl.NumberFormat(locale, {
    useGrouping: true,
    minimumFractionDigits: 1,
  }).formatToParts(-1234567.5);
  const part = (type: Intl.NumberFormatPartTypes, fallback: string) =>
    parts.find((p) => p.type === type)?.value ?? fallback;
  const digitFormat = new Intl.NumberFormat(locale, { useGrouping: false });
  const symbols: LocaleSymbols = Object.freeze({
    decimal: part('decimal', '.'),
    group: part('group', ','),
    minusSign: part('minusSign', '-'),
    digits: Object.freeze(Array.from({ length: 10 }, (_, digit) => digitFormat.format(digit))),
  });
  cache.set(locale, symbols);
  return symbols;
}
