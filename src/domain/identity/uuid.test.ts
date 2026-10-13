import * as fc from 'fast-check';
import { randomBytes } from 'node:crypto';

import {
  createUuidGenerator,
  InvalidUuidError,
  isUuid,
  uuid,
  UUID_RANDOM_BYTES,
  uuidFrom,
  uuidTimestamp,
} from './uuid';

const zeros = new Uint8Array(UUID_RANDOM_BYTES);
const ones = new Uint8Array(UUID_RANDOM_BYTES).fill(0xff);
const secureBytes = (length: number) => new Uint8Array(randomBytes(length));

describe('uuidFrom', () => {
  it('matches the RFC 9562 layout', () => {
    // Timestamp 0x017F22E279B0 (RFC 9562 appendix A.6), all-zero and all-one random bits.
    expect(uuidFrom(0x017f22e279b0, zeros)).toBe('017f22e2-79b0-7000-8000-000000000000');
    expect(uuidFrom(0x017f22e279b0, ones)).toBe('017f22e2-79b0-7fff-bfff-ffffffffffff');
    expect(uuidFrom(0, zeros)).toBe('00000000-0000-7000-8000-000000000000');
    expect(uuidFrom(2 ** 48 - 1, ones)).toBe('ffffffff-ffff-7fff-bfff-ffffffffffff');
  });

  it('places the random bytes after the version and variant bits', () => {
    const bytes = Uint8Array.from([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0, 0x11, 0x22]);
    // 80 bits are supplied and the top 6 are dropped, leaving 74:
    //   rand_a = 10 00110100 01            = 0x8d1
    //   rand_b = 010110 + 78 9a bc de f0 11 22, behind the variant bits 10 = 0x96789abcdef01122
    expect(uuidFrom(1, bytes)).toBe('00000000-0001-78d1-9678-9abcdef01122');
    expect(isUuid(uuidFrom(1, bytes))).toBe(true);
  });

  it.each([-1, 2 ** 48, 1.5, NaN, Infinity])('rejects timestamp %p', (timestamp) => {
    expect(() => uuidFrom(timestamp, zeros)).toThrow(InvalidUuidError);
  });

  it.each([new Uint8Array(9), new Uint8Array(11), new Uint8Array(0)])(
    'rejects %p random bytes',
    (bytes) => {
      expect(() => uuidFrom(1, bytes)).toThrow(InvalidUuidError);
    },
  );

  it('rejects random input that is not a byte array', () => {
    expect(() => uuidFrom(1, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as unknown as Uint8Array)).toThrow(
      InvalidUuidError,
    );
  });

  it('is always valid, keeps its timestamp, and sorts by time', () => {
    const anyTime = fc.integer({ min: 0, max: 2 ** 48 - 1 });
    const anyBytes = fc.uint8Array({ minLength: 10, maxLength: 10 });
    fc.assert(
      fc.property(anyTime, anyBytes, anyTime, anyBytes, (t1, b1, t2, b2) => {
        const [a, b] = [uuidFrom(t1, b1), uuidFrom(t2, b2)];
        expect(isUuid(a)).toBe(true);
        expect(uuidTimestamp(a)).toBe(t1);
        if (t1 !== t2) {
          expect(a < b).toBe(t1 < t2);
        }
      }),
    );
  });
});

describe('isUuid and uuid', () => {
  it('accepts canonical lowercase UUIDv7', () => {
    expect(isUuid('017f22e2-79b0-7cc3-98c4-dc0c0c07398f')).toBe(true);
    expect(uuid('017f22e2-79b0-7cc3-98c4-dc0c0c07398f')).toBe(
      '017f22e2-79b0-7cc3-98c4-dc0c0c07398f',
    );
  });

  it.each([
    '017F22E2-79B0-7CC3-98C4-DC0C0C07398F', // uppercase
    '017f22e2-79b0-4cc3-98c4-dc0c0c07398f', // version 4
    '017f22e2-79b0-7cc3-18c4-dc0c0c07398f', // wrong variant
    '017f22e2-79b0-7cc3-c8c4-dc0c0c07398f', // wrong variant
    '017f22e279b07cc398c4dc0c0c07398f', // no hyphens
    '{017f22e2-79b0-7cc3-98c4-dc0c0c07398f}',
    '017f22e2-79b0-7cc3-98c4-dc0c0c07398', // short
    '017f22e2-79b0-7cc3-98c4-dc0c0c07398ff', // long
    ' 017f22e2-79b0-7cc3-98c4-dc0c0c07398f',
    '017f22e2-79b0-7cc3-98c4-dc0c0c07398g',
    '00000000-0000-0000-0000-000000000000',
    '',
  ])('rejects %p', (text) => {
    expect(isUuid(text)).toBe(false);
    expect(() => uuid(text)).toThrow(InvalidUuidError);
  });

  it.each([undefined, null, 7, {}])('rejects non-string %p', (value) => {
    expect(isUuid(value)).toBe(false);
  });
});

describe('createUuidGenerator', () => {
  it('uses the clock and random source', () => {
    const next = createUuidGenerator({ now: () => 0x017f22e279b0, randomBytes: () => zeros });
    expect(next()).toBe('017f22e2-79b0-7000-8000-000000000000');
  });

  it('counts upward within the same millisecond instead of drawing again', () => {
    let draws = 0;
    const next = createUuidGenerator({
      now: () => 1000,
      randomBytes: () => {
        draws += 1;
        return zeros;
      },
    });
    expect([next(), next(), next()]).toEqual([
      '00000000-03e8-7000-8000-000000000000',
      '00000000-03e8-7000-8000-000000000001',
      '00000000-03e8-7000-8000-000000000002',
    ]);
    expect(draws).toBe(1);
  });

  it('carries from rand_b into rand_a', () => {
    const lowBitsFull = Uint8Array.from([0, 0, 0x3f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
    const next = createUuidGenerator({ now: () => 1000, randomBytes: () => lowBitsFull });
    expect(next()).toBe('00000000-03e8-7000-bfff-ffffffffffff');
    expect(next()).toBe('00000000-03e8-7001-8000-000000000000');
  });

  it('borrows the next millisecond when the random part is exhausted', () => {
    const next = createUuidGenerator({ now: () => 1000, randomBytes: () => ones });
    const first = next();
    const second = next();
    expect(first).toBe('00000000-03e8-7fff-bfff-ffffffffffff');
    expect(uuidTimestamp(second)).toBe(1001);
    expect(second > first).toBe(true);
  });

  it('keeps increasing when the clock steps backwards', () => {
    const times = [5000, 4000, 3000, 5000, 6000];
    const next = createUuidGenerator({
      now: () => times.shift() ?? 6000,
      randomBytes: secureBytes,
    });
    const ids = [next(), next(), next(), next(), next()];
    expect([...ids].sort()).toEqual(ids);
    expect(ids.map(uuidTimestamp)).toEqual([5000, 5000, 5000, 5000, 6000]);
  });

  it('rejects an invalid clock or random source', () => {
    expect(createUuidGenerator({ now: () => -1, randomBytes: secureBytes })).toThrow(
      InvalidUuidError,
    );
    expect(createUuidGenerator({ now: () => 1, randomBytes: () => new Uint8Array(4) })).toThrow(
      InvalidUuidError,
    );
  });

  it('produces unique, valid, strictly increasing ids in bulk', () => {
    const next = createUuidGenerator({ now: Date.now, randomBytes: secureBytes });
    const ids = Array.from({ length: 20000 }, next);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every(isUuid)).toBe(true);
    for (let i = 1; i < ids.length; i += 1) {
      expect((ids[i] as string) > (ids[i - 1] as string)).toBe(true);
    }
  });

  it('is strictly increasing for any clock behaviour', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 2, maxLength: 50 }),
        (clock) => {
          const times = [...clock];
          const next = createUuidGenerator({
            now: () => times.shift() ?? 0,
            randomBytes: secureBytes,
          });
          const ids = clock.map(() => next());
          for (let i = 1; i < ids.length; i += 1) {
            expect((ids[i] as string) > (ids[i - 1] as string)).toBe(true);
          }
        },
      ),
    );
  });
});
