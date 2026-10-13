import {
  CryptoInputError,
  DecryptionError,
  KEY_BYTES,
  NONCE_BYTES,
  SALT_BYTES,
  TAG_BYTES,
  type Argon2idParams,
  type CryptoProvider,
  type RandomSource,
} from '@/application/ports';

import { RECOVERY_ENTROPY_BYTES } from './recovery-phrase';

/**
 * Key hierarchy (docs/security.md §6):
 *
 *   Vault Master Key (VMK): 32 random bytes made on the device
 *     ├─ kept in the platform key store for daily unlock (device-key.ts)
 *     └─ sealed under a key derived from the recovery phrase (this file)
 *   VMK → database key · backup key · attachment key
 */

/** 32 fresh random bytes. The caller owns the buffer and wipes it when done. */
export function generateVaultMasterKey(random: RandomSource): Uint8Array {
  const key = random.bytes(KEY_BYTES);
  if (!(key instanceof Uint8Array) || key.length !== KEY_BYTES) {
    throw new CryptoInputError('Random source returned the wrong number of bytes');
  }
  return key;
}

/** Overwrites key material. Best effort: JavaScript may still hold copies elsewhere. */
export function wipe(...buffers: (Uint8Array | null | undefined)[]): void {
  for (const buffer of buffers) {
    buffer?.fill(0);
  }
}

// One purpose per key (docs/security.md §5). Ids and context are part of the
// on-disk format: never renumber or reuse them.
const SUBKEY_CONTEXT = 'cashline';
const SUBKEY_IDS = { database: 1, backup: 2, attachment: 3 } as const;

export type VaultKeys = {
  /** Raw SQLCipher key. */
  readonly databaseKey: Uint8Array;
  readonly backupKey: Uint8Array;
  readonly attachmentKey: Uint8Array;
};

export function deriveVaultKeys(crypto: CryptoProvider, vaultMasterKey: Uint8Array): VaultKeys {
  const derive = (id: number) => crypto.deriveSubkey(vaultMasterKey, SUBKEY_CONTEXT, id, KEY_BYTES);
  return {
    databaseKey: derive(SUBKEY_IDS.database),
    backupKey: derive(SUBKEY_IDS.backup),
    attachmentKey: derive(SUBKEY_IDS.attachment),
  };
}

/**
 * Argon2id cost for the recovery key: 3 passes over 64 MiB, one lane. This is
 * the memory size of RFC 9106's second recommended option and above the OWASP
 * minimum (19 MiB, 2 passes). The phrase itself carries 256 bits of entropy,
 * so this cost is defence in depth rather than the only protection.
 */
export const DEFAULT_RECOVERY_KDF: Argon2idParams = Object.freeze({
  opsLimit: 3,
  memLimitBytes: 64 * 1024 * 1024,
});

// Bounds for parameters read from a file. The floor stops a tampered file from
// weakening the derivation; the ceiling stops it from exhausting the device.
const KDF_LIMITS = {
  minOps: 2,
  maxOps: 10,
  minMemory: 19 * 1024 * 1024,
  maxMemory: 1024 * 1024 * 1024,
} as const;

export const RECOVERY_ENVELOPE_VERSION = 1;

/** The VMK sealed under the recovery phrase. Contains no secret in the clear. */
export type RecoveryEnvelope = {
  readonly version: typeof RECOVERY_ENVELOPE_VERSION;
  readonly kdf: 'argon2id13';
  readonly opsLimit: number;
  readonly memLimitBytes: number;
  readonly salt: Uint8Array;
  readonly nonce: Uint8Array;
  /** Sealed VMK: 32 bytes of ciphertext followed by the 16-byte tag. */
  readonly sealedKey: Uint8Array;
};

export class WrongRecoveryPhraseError extends Error {
  constructor() {
    super('The recovery phrase does not open this vault');
    this.name = 'WrongRecoveryPhraseError';
  }
}

export class InvalidRecoveryEnvelopeError extends Error {
  constructor() {
    super('Recovery data is missing, damaged or not supported');
    this.name = 'InvalidRecoveryEnvelopeError';
  }
}

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

function fromHex(text: unknown, length: number): Uint8Array {
  if (typeof text !== 'string' || text.length !== length * 2 || !/^[0-9a-f]*$/.test(text)) {
    throw new InvalidRecoveryEnvelopeError();
  }
  return Uint8Array.from({ length }, (_, i) => parseInt(text.slice(i * 2, i * 2 + 2), 16));
}

// Everything in the envelope except the ciphertext is bound into the
// authentication tag, so none of it can be changed without detection.
function associatedData(envelope: Omit<RecoveryEnvelope, 'nonce' | 'sealedKey'>): string {
  return [
    'cashline-recovery',
    envelope.version,
    envelope.kdf,
    envelope.opsLimit,
    envelope.memLimitBytes,
    toHex(envelope.salt),
  ].join('|');
}

function assertEnvelope(envelope: RecoveryEnvelope): void {
  const ok =
    envelope.version === RECOVERY_ENVELOPE_VERSION &&
    envelope.kdf === 'argon2id13' &&
    Number.isInteger(envelope.opsLimit) &&
    envelope.opsLimit >= KDF_LIMITS.minOps &&
    envelope.opsLimit <= KDF_LIMITS.maxOps &&
    Number.isInteger(envelope.memLimitBytes) &&
    envelope.memLimitBytes >= KDF_LIMITS.minMemory &&
    envelope.memLimitBytes <= KDF_LIMITS.maxMemory &&
    envelope.salt instanceof Uint8Array &&
    envelope.salt.length === SALT_BYTES &&
    envelope.nonce instanceof Uint8Array &&
    envelope.nonce.length === NONCE_BYTES &&
    envelope.sealedKey instanceof Uint8Array &&
    envelope.sealedKey.length === KEY_BYTES + TAG_BYTES;
  if (!ok) {
    throw new InvalidRecoveryEnvelopeError();
  }
}

function assertEntropy(entropy: Uint8Array): void {
  if (!(entropy instanceof Uint8Array) || entropy.length !== RECOVERY_ENTROPY_BYTES) {
    throw new CryptoInputError('Recovery entropy must be 32 bytes');
  }
}

/** Seals the VMK under a key derived from the recovery phrase entropy. */
export async function sealVaultKeyForRecovery(
  crypto: CryptoProvider,
  random: RandomSource,
  vaultMasterKey: Uint8Array,
  recoveryEntropy: Uint8Array,
  params: Argon2idParams = DEFAULT_RECOVERY_KDF,
): Promise<RecoveryEnvelope> {
  assertEntropy(recoveryEntropy);
  if (!(vaultMasterKey instanceof Uint8Array) || vaultMasterKey.length !== KEY_BYTES) {
    throw new CryptoInputError('Vault master key must be 32 bytes');
  }
  const header = {
    version: RECOVERY_ENVELOPE_VERSION,
    kdf: 'argon2id13',
    opsLimit: params.opsLimit,
    memLimitBytes: params.memLimitBytes,
    salt: random.bytes(SALT_BYTES),
  } as const;
  const nonce = random.bytes(NONCE_BYTES);
  const placeholder = { ...header, nonce, sealedKey: new Uint8Array(KEY_BYTES + TAG_BYTES) };
  assertEnvelope(placeholder);

  const recoveryKey = await crypto.argon2id(recoveryEntropy, header.salt, params, KEY_BYTES);
  try {
    const sealedKey = crypto.seal(recoveryKey, nonce, vaultMasterKey, associatedData(header));
    return Object.freeze({ ...header, nonce, sealedKey });
  } finally {
    wipe(recoveryKey);
  }
}

/**
 * Recovers the VMK. Throws `WrongRecoveryPhraseError` when the phrase is not
 * the right one or the envelope was altered; the two cannot be told apart.
 */
export async function openVaultKeyWithRecovery(
  crypto: CryptoProvider,
  envelope: RecoveryEnvelope,
  recoveryEntropy: Uint8Array,
): Promise<Uint8Array> {
  assertEnvelope(envelope);
  assertEntropy(recoveryEntropy);
  const recoveryKey = await crypto.argon2id(
    recoveryEntropy,
    envelope.salt,
    { opsLimit: envelope.opsLimit, memLimitBytes: envelope.memLimitBytes },
    KEY_BYTES,
  );
  try {
    return crypto.open(recoveryKey, envelope.nonce, envelope.sealedKey, associatedData(envelope));
  } catch (error) {
    if (error instanceof DecryptionError) {
      throw new WrongRecoveryPhraseError();
    }
    throw error;
  } finally {
    wipe(recoveryKey);
  }
}

/** JSON-safe form for the vault metadata and the backup header. */
export type EncodedRecoveryEnvelope = {
  readonly version: number;
  readonly kdf: string;
  readonly opsLimit: number;
  readonly memLimitBytes: number;
  readonly salt: string;
  readonly nonce: string;
  readonly sealedKey: string;
};

export function encodeRecoveryEnvelope(envelope: RecoveryEnvelope): EncodedRecoveryEnvelope {
  assertEnvelope(envelope);
  return {
    version: envelope.version,
    kdf: envelope.kdf,
    opsLimit: envelope.opsLimit,
    memLimitBytes: envelope.memLimitBytes,
    salt: toHex(envelope.salt),
    nonce: toHex(envelope.nonce),
    sealedKey: toHex(envelope.sealedKey),
  };
}

/** Strictly validates untrusted input, for example a header read from a backup file. */
export function decodeRecoveryEnvelope(value: unknown): RecoveryEnvelope {
  if (typeof value !== 'object' || value === null) {
    throw new InvalidRecoveryEnvelopeError();
  }
  const raw = value as Record<string, unknown>;
  const envelope = {
    version: raw.version,
    kdf: raw.kdf,
    opsLimit: raw.opsLimit,
    memLimitBytes: raw.memLimitBytes,
    salt: fromHex(raw.salt, SALT_BYTES),
    nonce: fromHex(raw.nonce, NONCE_BYTES),
    sealedKey: fromHex(raw.sealedKey, KEY_BYTES + TAG_BYTES),
  } as RecoveryEnvelope;
  assertEnvelope(envelope);
  return Object.freeze(envelope);
}
