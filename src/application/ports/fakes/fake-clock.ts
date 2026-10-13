import { instant, type Instant } from '@/domain/identity/instant';

import type { Clock } from '../clock';

/** A clock tests can set and move, including backwards. */
export class FakeClock implements Clock {
  private current: Instant;

  constructor(start = 1_760_000_000_000) {
    this.current = instant(start);
  }

  now(): Instant {
    return this.current;
  }

  set(epochMilliseconds: number): void {
    this.current = instant(epochMilliseconds);
  }

  advance(milliseconds: number): void {
    this.current = instant(this.current + milliseconds);
  }
}
