/** Port for cryptographically secure random bytes from the platform. */
export interface RandomSource {
  /** Returns `length` fresh random bytes. `length` is a whole number from 0 to 1024. */
  bytes(length: number): Uint8Array;
}

export const MAX_RANDOM_BYTES = 1024;

export function assertRandomLength(length: number): void {
  if (!Number.isInteger(length) || length < 0 || length > MAX_RANDOM_BYTES) {
    throw new RangeError('Random byte count must be a whole number from 0 to 1024');
  }
}
