import { assertRandomLength, type RandomSource } from '../random-source';

/**
 * Repeatable byte sequence for tests. NOT random and never shipped: the same
 * seed always yields the same bytes, so tests that involve ids or keys are
 * deterministic.
 */
export class FakeRandomSource implements RandomSource {
  private state: number;

  constructor(seed = 1) {
    this.state = seed >>> 0 || 1;
  }

  bytes(length: number): Uint8Array {
    assertRandomLength(length);
    const out = new Uint8Array(length);
    for (let i = 0; i < length; i += 1) {
      // xorshift32
      this.state ^= this.state << 13;
      this.state >>>= 0;
      this.state ^= this.state >>> 17;
      this.state ^= this.state << 5;
      this.state >>>= 0;
      out[i] = this.state & 0xff;
    }
    return out;
  }
}
