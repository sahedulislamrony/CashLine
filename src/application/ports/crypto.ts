/**
 * Port for the cryptographic primitives the vault needs (docs/security.md §5).
 * Implemented with libsodium; the app never implements a primitive itself.
 *
 * All inputs and outputs are bytes. Implementations validate lengths and throw
 * rather than truncate or pad.
 */
export interface CryptoProvider {
  /**
   * Argon2id (version 1.3) with one lane. Memory-hard, so deliberately slow;
   * asynchronous so an implementation may run it off the UI thread.
   */
  argon2id(
    secret: Uint8Array,
    salt: Uint8Array,
    params: Argon2idParams,
    outputLength: number,
  ): Promise<Uint8Array>;

  /**
   * XChaCha20-Poly1305 (IETF) authenticated encryption. Returns ciphertext
   * followed by the 16-byte tag. `nonce` must be fresh random bytes for every
   * call with the same key. `associatedData` is authenticated but not encrypted.
   */
  seal(
    key: Uint8Array,
    nonce: Uint8Array,
    plaintext: Uint8Array,
    associatedData: string,
  ): Uint8Array;

  /** Reverses `seal`. Throws `DecryptionError` if anything was altered or the key is wrong. */
  open(key: Uint8Array, nonce: Uint8Array, sealed: Uint8Array, associatedData: string): Uint8Array;

  /**
   * Derives an independent subkey from a 32-byte master key (libsodium
   * `crypto_kdf`, BLAKE2b). `context` is exactly 8 ASCII characters; different
   * contexts or ids give unrelated keys.
   */
  deriveSubkey(
    masterKey: Uint8Array,
    context: string,
    id: number,
    outputLength: number,
  ): Uint8Array;

  sha256(data: Uint8Array): Uint8Array;
}

export type Argon2idParams = {
  /** Number of passes (libsodium `opslimit`). */
  readonly opsLimit: number;
  /** Memory in bytes (libsodium `memlimit`). */
  readonly memLimitBytes: number;
};

export const KEY_BYTES = 32;
export const NONCE_BYTES = 24;
export const SALT_BYTES = 16;
export const TAG_BYTES = 16;
export const SUBKEY_CONTEXT_LENGTH = 8;

/** Deliberately carries no detail: a wrong key and tampered data look the same. */
export class DecryptionError extends Error {
  constructor() {
    super('Decryption failed');
    this.name = 'DecryptionError';
  }
}

export class CryptoInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CryptoInputError';
  }
}
