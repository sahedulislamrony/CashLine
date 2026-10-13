import type { CryptoProvider } from '@/application/ports';

import { bip39English } from './bip39-english';

/**
 * The recovery phrase: 24 words from the BIP39 English list, encoding 256 bits
 * of entropy plus an 8-bit checksum (docs/memory.md O-22). Only the word
 * encoding follows BIP39; the key is derived by the vault's own Argon2id step,
 * not by BIP39's seed function.
 *
 * The phrase is shown once and never stored, logged or copied
 * (docs/security.md §6). Errors here never contain words from the phrase.
 */
export const RECOVERY_WORD_COUNT = 24;
export const RECOVERY_ENTROPY_BYTES = 32;

export type RecoveryPhraseFailure = 'wrong-length' | 'unknown-word' | 'bad-checksum';

export class InvalidRecoveryPhraseError extends Error {
  constructor(
    readonly reason: RecoveryPhraseFailure,
    /** 1-based position of the first word not in the list, when that is the reason. */
    readonly position?: number,
  ) {
    super(`Recovery phrase is not valid: ${reason}`);
    this.name = 'InvalidRecoveryPhraseError';
  }
}

const wordIndex = new Map(bip39English.map((word, index) => [word, index]));

/** Lowercases and splits on any whitespace, so pasted or hand-typed phrases both work. */
export function splitRecoveryPhrase(text: string): string[] {
  return typeof text === 'string'
    ? text.normalize('NFKD').toLowerCase().split(/\s+/).filter(Boolean)
    : [];
}

function checksumByte(crypto: CryptoProvider, entropy: Uint8Array): number {
  return crypto.sha256(entropy)[0] ?? 0;
}

/** Encodes 32 bytes of entropy as 24 words. */
export function entropyToRecoveryWords(crypto: CryptoProvider, entropy: Uint8Array): string[] {
  if (!(entropy instanceof Uint8Array) || entropy.length !== RECOVERY_ENTROPY_BYTES) {
    throw new TypeError(`Entropy must be ${RECOVERY_ENTROPY_BYTES} bytes`);
  }
  // 256 bits of entropy followed by 8 checksum bits, read 11 bits at a time.
  let bits = BigInt(checksumByte(crypto, entropy));
  let shift = 8n;
  for (let i = entropy.length - 1; i >= 0; i -= 1) {
    bits |= BigInt(entropy[i] ?? 0) << shift;
    shift += 8n;
  }
  const words: string[] = [];
  for (let i = RECOVERY_WORD_COUNT - 1; i >= 0; i -= 1) {
    words.push(bip39English[Number((bits >> BigInt(i * 11)) & 0x7ffn)] ?? '');
  }
  return words;
}

/**
 * Decodes a typed phrase back to its 32 bytes of entropy, verifying the
 * checksum so that a mistyped or reordered word is caught before any slow key
 * derivation.
 */
export function recoveryWordsToEntropy(
  crypto: CryptoProvider,
  phrase: string | readonly string[],
): Uint8Array {
  const words = splitRecoveryPhrase(Array.isArray(phrase) ? phrase.join(' ') : (phrase as string));
  if (words.length !== RECOVERY_WORD_COUNT) {
    throw new InvalidRecoveryPhraseError('wrong-length');
  }
  let bits = 0n;
  words.forEach((word, position) => {
    const index = wordIndex.get(word);
    if (index === undefined) {
      throw new InvalidRecoveryPhraseError('unknown-word', position + 1);
    }
    bits = (bits << 11n) | BigInt(index);
  });
  const entropy = new Uint8Array(RECOVERY_ENTROPY_BYTES);
  for (let i = 0; i < RECOVERY_ENTROPY_BYTES; i += 1) {
    entropy[i] = Number((bits >> BigInt((RECOVERY_ENTROPY_BYTES - i) * 8)) & 0xffn);
  }
  if (Number(bits & 0xffn) !== checksumByte(crypto, entropy)) {
    entropy.fill(0);
    throw new InvalidRecoveryPhraseError('bad-checksum');
  }
  return entropy;
}

export function isRecoveryWord(word: string): boolean {
  return wordIndex.has(word);
}

/**
 * Positions (1-based) the user is asked to re-enter to confirm they saved the
 * phrase. Chosen from secure random bytes, distinct and in ascending order.
 */
export function pickConfirmationPositions(
  randomBytes: (length: number) => Uint8Array,
  count = 4,
): number[] {
  if (!Number.isInteger(count) || count < 1 || count > RECOVERY_WORD_COUNT) {
    throw new RangeError('Confirmation count is out of range');
  }
  const remaining = Array.from({ length: RECOVERY_WORD_COUNT }, (_, i) => i + 1);
  const picked: number[] = [];
  while (picked.length < count) {
    // Rejection sampling keeps every position equally likely.
    const limit = 256 - (256 % remaining.length);
    const byte = randomBytes(1)[0] ?? 0;
    if (byte < limit) {
      picked.push(...remaining.splice(byte % remaining.length, 1));
    }
  }
  return picked.sort((a, b) => a - b);
}

/** True when the words the user typed match the phrase at the asked positions. */
export function confirmRecoveryWords(
  words: readonly string[],
  positions: readonly number[],
  answers: readonly string[],
): boolean {
  if (positions.length === 0 || positions.length !== answers.length) {
    return false;
  }
  return positions.every((position, i) => {
    const [answer] = splitRecoveryPhrase(answers[i] ?? '');
    return answer !== undefined && words[position - 1] === answer;
  });
}
