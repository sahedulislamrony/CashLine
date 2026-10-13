/**
 * A point in time as whole milliseconds since the Unix epoch, in UTC.
 * Creation and update times use this type (docs/project-specifications.md §8).
 * It is an integer so it stores and sorts exactly in SQLite. Calendar dates
 * (entry, invoice and due dates) are a different type: see ../dates.
 */

declare const instantBrand: unique symbol;

export type Instant = number & { readonly [instantBrand]: true };

/** 9999-12-31T23:59:59.999Z */
export const MAX_INSTANT = 253402300799999;

export class InvalidInstantError extends Error {
  constructor() {
    super('Not a valid instant');
    this.name = 'InvalidInstantError';
  }
}

export function isInstant(value: unknown): value is Instant {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_INSTANT;
}

export function instant(epochMilliseconds: number): Instant {
  if (!isInstant(epochMilliseconds)) {
    throw new InvalidInstantError();
  }
  return epochMilliseconds;
}

export function instantFromDate(date: Date): Instant {
  return instant(date instanceof Date ? date.getTime() : NaN);
}

/** `YYYY-MM-DDTHH:mm:ss.sssZ`, always UTC. */
export function toIsoString(value: Instant): string {
  return new Date(instant(value)).toISOString();
}

const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/** Parses exactly the text `toIsoString` writes. Offsets and local times are rejected. */
export function instantFromIsoString(text: string): Instant {
  const milliseconds = typeof text === 'string' && isoPattern.test(text) ? Date.parse(text) : NaN;
  // Date.parse accepts some impossible dates (for example 30 February) by rolling them over.
  if (!isInstant(milliseconds) || new Date(milliseconds).toISOString() !== text) {
    throw new InvalidInstantError();
  }
  return milliseconds;
}
