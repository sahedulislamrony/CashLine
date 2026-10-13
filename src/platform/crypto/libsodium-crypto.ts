import { sha256 } from '@noble/hashes/sha2';

import {
  CryptoInputError,
  DecryptionError,
  KEY_BYTES,
  NONCE_BYTES,
  SALT_BYTES,
  SUBKEY_CONTEXT_LENGTH,
  TAG_BYTES,
  type Argon2idParams,
  type CryptoProvider,
} from '@/application/ports';

/**
 * The part of the libsodium API this adapter uses. `react-native-libsodium`
 * (JSI, on device) and `libsodium-wrappers-sumo` (WebAssembly, in tests) both
 * provide it, so the same adapter code runs against real libsodium in both.
 */
export type Sodium = {
  readonly ready: Promise<unknown>;
  readonly crypto_pwhash_ALG_ARGON2ID13: number;
  crypto_pwhash(
    keyLength: number,
    password: Uint8Array,
    salt: Uint8Array,
    opsLimit: number,
    memLimit: number,
    algorithm: number,
  ): Uint8Array;
  crypto_aead_xchacha20poly1305_ietf_encrypt(
    message: Uint8Array,
    additionalData: string | null,
    secretNonce: null,
    publicNonce: Uint8Array,
    key: Uint8Array,
  ): Uint8Array;
  crypto_aead_xchacha20poly1305_ietf_decrypt(
    secretNonce: null,
    ciphertext: Uint8Array,
    additionalData: string | null,
    publicNonce: Uint8Array,
    key: Uint8Array,
  ): Uint8Array;
  crypto_kdf_derive_from_key(
    subkeyLength: number,
    subkeyId: number,
    context: string,
    key: Uint8Array,
  ): Uint8Array;
};

function assertBytes(value: Uint8Array, length: number | null, name: string): void {
  if (!(value instanceof Uint8Array) || (length !== null && value.length !== length)) {
    throw new CryptoInputError(
      length === null ? `${name} must be bytes` : `${name} must be ${length} bytes`,
    );
  }
}

function assertLength(value: number, min: number, max: number, name: string): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new CryptoInputError(`${name} is out of range`);
  }
}

/** Resolves once libsodium is initialized. */
export async function createLibsodiumCrypto(sodium: Sodium): Promise<CryptoProvider> {
  await sodium.ready;

  return {
    async argon2id(secret, salt, params: Argon2idParams, outputLength) {
      assertBytes(secret, null, 'Secret');
      assertBytes(salt, SALT_BYTES, 'Salt');
      assertLength(outputLength, 16, 64, 'Output length');
      assertLength(params.opsLimit, 1, 2 ** 32 - 1, 'Argon2id passes');
      assertLength(params.memLimitBytes, 8192, Number.MAX_SAFE_INTEGER, 'Argon2id memory');
      return sodium.crypto_pwhash(
        outputLength,
        secret,
        salt,
        params.opsLimit,
        params.memLimitBytes,
        sodium.crypto_pwhash_ALG_ARGON2ID13,
      );
    },

    seal(key, nonce, plaintext, associatedData) {
      assertBytes(key, KEY_BYTES, 'Key');
      assertBytes(nonce, NONCE_BYTES, 'Nonce');
      assertBytes(plaintext, null, 'Plaintext');
      return sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
        plaintext,
        associatedData,
        null,
        nonce,
        key,
      );
    },

    open(key, nonce, sealed, associatedData) {
      assertBytes(key, KEY_BYTES, 'Key');
      assertBytes(nonce, NONCE_BYTES, 'Nonce');
      assertBytes(sealed, null, 'Ciphertext');
      if (sealed.length < TAG_BYTES) {
        throw new DecryptionError();
      }
      try {
        return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
          null,
          sealed,
          associatedData,
          nonce,
          key,
        );
      } catch {
        // Never pass the library's message on: it must not reveal why it failed.
        throw new DecryptionError();
      }
    },

    deriveSubkey(masterKey, context, id, outputLength) {
      assertBytes(masterKey, KEY_BYTES, 'Master key');
      assertLength(outputLength, 16, 64, 'Output length');
      assertLength(id, 0, 2 ** 32 - 1, 'Subkey id');
      if (typeof context !== 'string' || !/^[\x21-\x7e]{8}$/.test(context)) {
        throw new CryptoInputError(`Context must be ${SUBKEY_CONTEXT_LENGTH} ASCII characters`);
      }
      return sodium.crypto_kdf_derive_from_key(outputLength, id, context, masterKey);
    },

    sha256(data) {
      assertBytes(data, null, 'Data');
      return sha256(data);
    },
  };
}
