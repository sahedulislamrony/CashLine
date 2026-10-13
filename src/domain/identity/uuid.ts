/**
 * UUIDv7 identifiers (RFC 9562): a 48-bit Unix millisecond timestamp followed
 * by random bits, so ids sort by creation time. Every record uses one as its
 * primary key (docs/project-specifications.md §8).
 *
 * This module is pure. The clock and the random bytes are passed in, so the
 * platform layer supplies a cryptographically secure source.
 */

declare const uuidBrand: unique symbol;

/** A canonical lowercase UUIDv7. Text order equals creation order. */
export type Uuid = string & { readonly [uuidBrand]: true };

export const UUID_RANDOM_BYTES = 10;

const MAX_TIMESTAMP = 2 ** 48 - 1;
const RANDOM_BITS = 74n; // 12 bits (rand_a) + 62 bits (rand_b)
const MAX_RANDOM = (1n << RANDOM_BITS) - 1n;

export class InvalidUuidError extends Error {
  constructor(message = 'Not a valid UUIDv7') {
    super(message);
    this.name = 'InvalidUuidError';
  }
}

const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** True for canonical lowercase UUIDv7 text. */
export function isUuid(value: unknown): value is Uuid {
  return typeof value === 'string' && pattern.test(value);
}

export function uuid(text: string): Uuid {
  if (!isUuid(text)) {
    throw new InvalidUuidError();
  }
  return text;
}

/** The Unix millisecond timestamp embedded in a UUIDv7. */
export function uuidTimestamp(id: Uuid): number {
  return parseInt(id.slice(0, 8) + id.slice(9, 13), 16);
}

function encode(timestamp: number, random: bigint): Uuid {
  const time = timestamp.toString(16).padStart(12, '0');
  const randA = (random >> 62n).toString(16).padStart(3, '0');
  // Variant bits "10" followed by the low 62 random bits.
  const randB = ((0b10n << 62n) | (random & ((1n << 62n) - 1n))).toString(16).padStart(16, '0');
  return `${time.slice(0, 8)}-${time.slice(8)}-7${randA}-${randB.slice(0, 4)}-${randB.slice(4)}` as Uuid;
}

function toRandom(bytes: Uint8Array): bigint {
  if (!(bytes instanceof Uint8Array) || bytes.length !== UUID_RANDOM_BYTES) {
    throw new InvalidUuidError(`Expected ${UUID_RANDOM_BYTES} random bytes`);
  }
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }
  return value & MAX_RANDOM;
}

function assertTimestamp(timestamp: number): void {
  if (!Number.isInteger(timestamp) || timestamp < 0 || timestamp > MAX_TIMESTAMP) {
    throw new InvalidUuidError('Timestamp is outside the UUIDv7 range');
  }
}

/** Builds one UUIDv7 from a millisecond timestamp and 10 random bytes. */
export function uuidFrom(timestamp: number, randomBytes: Uint8Array): Uuid {
  assertTimestamp(timestamp);
  return encode(timestamp, toRandom(randomBytes));
}

export type UuidSources = {
  /** Current Unix time in milliseconds. */
  readonly now: () => number;
  /** Returns `length` cryptographically secure random bytes. */
  readonly randomBytes: (length: number) => Uint8Array;
};

/**
 * Returns a generator whose ids always increase, even when several are made in
 * the same millisecond or the clock steps backwards (RFC 9562 §6.2, method 2):
 * within one millisecond the random part is incremented instead of redrawn.
 */
export function createUuidGenerator(sources: UuidSources): () => Uuid {
  let lastTimestamp = -1;
  let lastRandom = 0n;
  return () => {
    const now = sources.now();
    assertTimestamp(now);
    if (now > lastTimestamp) {
      lastTimestamp = now;
      lastRandom = toRandom(sources.randomBytes(UUID_RANDOM_BYTES));
    } else if (lastRandom < MAX_RANDOM) {
      lastRandom += 1n;
    } else {
      // Random part exhausted within one millisecond: borrow the next millisecond.
      lastTimestamp += 1;
      assertTimestamp(lastTimestamp);
      lastRandom = toRandom(sources.randomBytes(UUID_RANDOM_BYTES));
    }
    return encode(lastTimestamp, lastRandom);
  };
}
