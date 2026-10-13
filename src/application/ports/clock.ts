import type { Instant } from '@/domain/identity/instant';

/** Port for the current time. Injected so time-dependent logic can be tested. */
export interface Clock {
  now(): Instant;
}
