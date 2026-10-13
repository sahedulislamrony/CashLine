/**
 * A non-negative quantity with up to three decimal places, held exactly as
 * thousandths (docs/adr/0003-rounding.md). 1.5 hours is { thousandths: 1500n }.
 */
export type Quantity = { readonly thousandths: bigint };

export const QUANTITY_DECIMALS = 3;
export const QUANTITY_SCALE = 1000n;

/** Upper bound: 999,999,999.999. Keeps quantity × amount far from silent misuse. */
export const MAX_QUANTITY_THOUSANDTHS = 999_999_999_999n;

export class InvalidQuantityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidQuantityError';
  }
}

const pattern = /^(\d{1,9})(?:\.(\d{1,3}))?$/;

/**
 * Parses a canonical decimal string such as "2", "1.5" or "0.125".
 * Locale-specific input is normalized before it reaches the domain.
 */
export function quantity(value: string): Quantity {
  const match = typeof value === 'string' ? pattern.exec(value) : null;
  if (!match) {
    throw new InvalidQuantityError(
      'Quantity must be a non-negative number with at most 3 decimal places',
    );
  }
  const whole = match[1] ?? '0';
  const fraction = (match[2] ?? '').padEnd(QUANTITY_DECIMALS, '0');
  return Object.freeze({ thousandths: BigInt(whole) * QUANTITY_SCALE + BigInt(fraction) });
}

/** Canonical decimal string without trailing zeros: "1.5", "2", "0.125". */
export function quantityToString(value: Quantity): string {
  const whole = value.thousandths / QUANTITY_SCALE;
  const fraction = (value.thousandths % QUANTITY_SCALE)
    .toString()
    .padStart(QUANTITY_DECIMALS, '0')
    .replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
