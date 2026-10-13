/** @jest-environment node */
import * as fc from 'fast-check';
import sodium from 'libsodium-wrappers-sumo';
import { createHash } from 'node:crypto';

import type { CryptoProvider } from '@/application/ports';
import { FakeRandomSource } from '@/application/ports/fakes';
import { createLibsodiumCrypto, type Sodium } from '@/platform/crypto/libsodium-crypto';

import { bip39English } from './bip39-english';
import vectors from './bip39-vectors.fixture.json';
import {
  confirmRecoveryWords,
  entropyToRecoveryWords,
  InvalidRecoveryPhraseError,
  isRecoveryWord,
  pickConfirmationPositions,
  recoveryWordsToEntropy,
  splitRecoveryPhrase,
} from './recovery-phrase';

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex');
const bytes = (text: string) => Uint8Array.from(Buffer.from(text, 'hex'));

let crypto: CryptoProvider;
beforeAll(async () => {
  crypto = await createLibsodiumCrypto(sodium as unknown as Sodium);
});

function reason(run: () => unknown) {
  try {
    run();
  } catch (error) {
    if (error instanceof InvalidRecoveryPhraseError) {
      return [error.reason, error.position];
    }
    throw error;
  }
  return ['no error', undefined];
}

describe('word list', () => {
  it('is the official BIP39 English list, unchanged', () => {
    expect(bip39English).toHaveLength(2048);
    expect(new Set(bip39English).size).toBe(2048);
    const original = `${bip39English.join('\n')}\n`;
    expect(createHash('sha256').update(original).digest('hex')).toBe(
      '2f5eed53a4727b4bf8880d8f3f199efc90e58503646d9ff8eff3a2ed3b24dbda',
    );
    expect(Object.isFrozen(bip39English)).toBe(true);
  });

  it('recognizes its words exactly', () => {
    expect(isRecoveryWord('abandon')).toBe(true);
    expect(isRecoveryWord('zoo')).toBe(true);
    expect(isRecoveryWord('Abandon')).toBe(false);
    expect(isRecoveryWord('abandn')).toBe(false);
  });
});

describe('encoding', () => {
  it.each(vectors as [string, string][])(
    'matches the official 24-word vector %s',
    (entropy, phrase) => {
      expect(entropyToRecoveryWords(crypto, bytes(entropy)).join(' ')).toBe(phrase);
      expect(hex(recoveryWordsToEntropy(crypto, phrase))).toBe(entropy);
      expect(hex(recoveryWordsToEntropy(crypto, phrase.split(' ')))).toBe(entropy);
    },
  );

  it('has official vectors to check against', () => {
    expect(vectors.length).toBeGreaterThanOrEqual(8);
  });

  it('round-trips any entropy', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 32, maxLength: 32 }), (entropy) => {
        const words = entropyToRecoveryWords(crypto, entropy);
        expect(words).toHaveLength(24);
        expect(words.every(isRecoveryWord)).toBe(true);
        expect(hex(recoveryWordsToEntropy(crypto, words))).toBe(hex(entropy));
      }),
    );
  });

  it.each([16, 31, 33, 0])('rejects %d bytes of entropy', (length) => {
    expect(() => entropyToRecoveryWords(crypto, new Uint8Array(length))).toThrow(TypeError);
  });

  it('rejects entropy that is not bytes', () => {
    expect(() => entropyToRecoveryWords(crypto, 'a'.repeat(32) as unknown as Uint8Array)).toThrow(
      TypeError,
    );
  });
});

describe('decoding a typed phrase', () => {
  const [, phrase] = (vectors as [string, string][])[2] as [string, string];
  const words = phrase.split(' ');

  it('accepts messy whitespace and capitals', () => {
    const typed = `  ${words.slice(0, 12).join('   ').toUpperCase()}\n${words.slice(12).join('\t')} `;
    expect(hex(recoveryWordsToEntropy(crypto, typed))).toBe(
      hex(recoveryWordsToEntropy(crypto, phrase)),
    );
  });

  it.each([0, 1, 12, 23, 25, 48])('rejects %d words', (count) => {
    const text = Array.from({ length: count }, (_, i) => words[i % 24]).join(' ');
    expect(reason(() => recoveryWordsToEntropy(crypto, text))).toEqual(['wrong-length', undefined]);
  });

  it('reports the position of a word that is not in the list, never the word', () => {
    const typed = [...words];
    typed[6] = 'cashline';
    try {
      recoveryWordsToEntropy(crypto, typed);
      throw new Error('expected an error');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidRecoveryPhraseError);
      expect(error).toMatchObject({ reason: 'unknown-word', position: 7 });
      expect(String(error) + JSON.stringify(error)).not.toContain('cashline');
      for (const word of words) {
        expect(String(error)).not.toContain(word);
      }
    }
  });

  it('catches a wrong but valid word through the checksum', () => {
    const typed = [...words];
    typed[3] = typed[3] === 'abandon' ? 'ability' : 'abandon';
    expect(reason(() => recoveryWordsToEntropy(crypto, typed))).toEqual([
      'bad-checksum',
      undefined,
    ]);
  });

  it('catches two swapped words through the checksum', () => {
    const typed = [...words];
    [typed[0], typed[23]] = [typed[23] as string, typed[0] as string];
    expect(reason(() => recoveryWordsToEntropy(crypto, typed))[0]).toBe('bad-checksum');
  });

  it('treats non-text input as an empty phrase', () => {
    expect(splitRecoveryPhrase(undefined as unknown as string)).toEqual([]);
    expect(reason(() => recoveryWordsToEntropy(crypto, 42 as unknown as string))[0]).toBe(
      'wrong-length',
    );
  });
});

describe('confirmation', () => {
  it('picks distinct ascending positions from 1 to 24', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 24 }),
        (seed, count) => {
          const random = new FakeRandomSource(seed);
          const positions = pickConfirmationPositions((n) => random.bytes(n), count);
          expect(positions).toHaveLength(count);
          expect(new Set(positions).size).toBe(count);
          expect([...positions].sort((a, b) => a - b)).toEqual(positions);
          expect(positions.every((p) => Number.isInteger(p) && p >= 1 && p <= 24)).toBe(true);
        },
      ),
    );
  });

  it('asks for four words by default and varies with the random source', () => {
    const a = pickConfirmationPositions((n) => new FakeRandomSource(1).bytes(n));
    expect(a).toHaveLength(4);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 30; seed += 1) {
      const random = new FakeRandomSource(seed);
      seen.add(pickConfirmationPositions((n) => random.bytes(n)).join(','));
    }
    expect(seen.size).toBeGreaterThan(20);
  });

  it('retries bytes that would bias the choice', () => {
    const queue = [255, 255, 0, 0, 0, 0];
    const positions = pickConfirmationPositions(() => Uint8Array.of(queue.shift() ?? 0), 2);
    expect(positions).toEqual([1, 2]);
  });

  it.each([0, 25, 1.5, -1])('rejects a count of %p', (count) => {
    expect(() => pickConfirmationPositions(() => Uint8Array.of(0), count)).toThrow(RangeError);
  });

  it('accepts the right words and rejects wrong, missing or misplaced ones', () => {
    const phrase = entropyToRecoveryWords(
      crypto,
      Uint8Array.from({ length: 32 }, (_, i) => i * 7),
    );
    const positions = [2, 9, 17, 24];
    const right = positions.map((p) => phrase[p - 1] as string);
    expect(confirmRecoveryWords(phrase, positions, right)).toBe(true);
    expect(
      confirmRecoveryWords(
        phrase,
        positions,
        right.map((w) => ` ${w.toUpperCase()} `),
      ),
    ).toBe(true);
    expect(confirmRecoveryWords(phrase, positions, [...right].reverse())).toBe(false);
    expect(confirmRecoveryWords(phrase, positions, right.slice(0, 3))).toBe(false);
    expect(confirmRecoveryWords(phrase, positions, [...right.slice(0, 3), ''])).toBe(false);
    expect(confirmRecoveryWords(phrase, positions, [...right.slice(0, 3), 'zzzz'])).toBe(false);
    expect(confirmRecoveryWords(phrase, [], [])).toBe(false);
    expect(confirmRecoveryWords(phrase, [25], ['abandon'])).toBe(false);
  });
});
