/** @jest-environment node */
import sodium from 'libsodium-wrappers-sumo';

import { CryptoInputError, KeyAccessError, type CryptoProvider } from '@/application/ports';
import { FakeRandomSource, FakeSecureKeyStore } from '@/application/ports/fakes';
import { createLibsodiumCrypto, type Sodium } from '@/platform/crypto/libsodium-crypto';

import {
  DEVICE_KEY_ALIAS,
  loadVaultKeyFromDevice,
  removeVaultKeyFromDevice,
  saveVaultKeyOnDevice,
} from './device-key';
import {
  decodeRecoveryEnvelope,
  DEFAULT_RECOVERY_KDF,
  deriveVaultKeys,
  encodeRecoveryEnvelope,
  generateVaultMasterKey,
  InvalidRecoveryEnvelopeError,
  openVaultKeyWithRecovery,
  sealVaultKeyForRecovery,
  wipe,
  WrongRecoveryPhraseError,
  type RecoveryEnvelope,
} from './key-hierarchy';
import { entropyToRecoveryWords, recoveryWordsToEntropy } from './recovery-phrase';

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex');
// The lowest cost the envelope accepts, to keep the suite fast.
const fastKdf = { opsLimit: 2, memLimitBytes: 19 * 1024 * 1024 };

let crypto: CryptoProvider;
let envelope: RecoveryEnvelope;
const random = new FakeRandomSource(11);
const vmk = new FakeRandomSource(21).bytes(32);
const entropy = new FakeRandomSource(31).bytes(32);

beforeAll(async () => {
  crypto = await createLibsodiumCrypto(sodium as unknown as Sodium);
  envelope = await sealVaultKeyForRecovery(crypto, random, vmk, entropy, fastKdf);
});

describe('vault master key', () => {
  it('is 32 bytes from the random source and differs each time', () => {
    const source = new FakeRandomSource(5);
    const a = generateVaultMasterKey(source);
    const b = generateVaultMasterKey(source);
    expect(a).toHaveLength(32);
    expect(hex(a)).not.toBe(hex(b));
  });

  it('rejects a random source that returns the wrong amount', () => {
    expect(() => generateVaultMasterKey({ bytes: () => new Uint8Array(16) })).toThrow(
      CryptoInputError,
    );
  });

  it('wipe zeroes buffers and ignores missing ones', () => {
    const a = Uint8Array.of(1, 2, 3);
    const b = Uint8Array.of(4, 5);
    wipe(a, null, undefined, b);
    expect([...a, ...b]).toEqual([0, 0, 0, 0, 0]);
  });
});

describe('derived keys', () => {
  it('gives three different 32-byte keys, none equal to the master key', () => {
    const keys = deriveVaultKeys(crypto, vmk);
    const all = [keys.databaseKey, keys.backupKey, keys.attachmentKey].map(hex);
    expect(all.every((k) => k.length === 64)).toBe(true);
    expect(new Set([...all, hex(vmk)]).size).toBe(4);
  });

  it('is repeatable for a master key and unrelated for another', () => {
    expect(hex(deriveVaultKeys(crypto, vmk).databaseKey)).toBe(
      hex(deriveVaultKeys(crypto, vmk).databaseKey),
    );
    const other = new FakeRandomSource(22).bytes(32);
    expect(hex(deriveVaultKeys(crypto, other).databaseKey)).not.toBe(
      hex(deriveVaultKeys(crypto, vmk).databaseKey),
    );
  });

  it('keeps its derivation fixed, because stored data depends on it', () => {
    // Regression pin: changing the context or ids would orphan every existing vault.
    const master = Uint8Array.from({ length: 32 }, (_, i) => i);
    const keys = deriveVaultKeys(crypto, master);
    expect(hex(keys.databaseKey)).toBe(hex(crypto.deriveSubkey(master, 'cashline', 1, 32)));
    expect(hex(keys.backupKey)).toBe(hex(crypto.deriveSubkey(master, 'cashline', 2, 32)));
    expect(hex(keys.attachmentKey)).toBe(hex(crypto.deriveSubkey(master, 'cashline', 3, 32)));
  });
});

describe('recovery envelope', () => {
  it('records the parameters and never contains the key or the phrase entropy', () => {
    expect(envelope).toMatchObject({ version: 1, kdf: 'argon2id13', ...fastKdf });
    expect(envelope.salt).toHaveLength(16);
    expect(envelope.nonce).toHaveLength(24);
    expect(envelope.sealedKey).toHaveLength(48);
    const text = JSON.stringify(encodeRecoveryEnvelope(envelope));
    expect(text).not.toContain(hex(vmk));
    expect(text).not.toContain(hex(entropy));
    expect(Object.isFrozen(envelope)).toBe(true);
  });

  it('opens with the right phrase', async () => {
    expect(hex(await openVaultKeyWithRecovery(crypto, envelope, entropy))).toBe(hex(vmk));
  });

  it('opens from the 24 words the user wrote down', async () => {
    const words = entropyToRecoveryWords(crypto, entropy);
    const typed = recoveryWordsToEntropy(crypto, words.join('  ').toUpperCase());
    expect(hex(await openVaultKeyWithRecovery(crypto, envelope, typed))).toBe(hex(vmk));
  });

  it('refuses a wrong phrase', async () => {
    const wrong = new FakeRandomSource(32).bytes(32);
    await expect(openVaultKeyWithRecovery(crypto, envelope, wrong)).rejects.toThrow(
      WrongRecoveryPhraseError,
    );
  });

  it('uses a fresh salt and nonce each time', async () => {
    const again = await sealVaultKeyForRecovery(crypto, random, vmk, entropy, fastKdf);
    expect(hex(again.salt)).not.toBe(hex(envelope.salt));
    expect(hex(again.nonce)).not.toBe(hex(envelope.nonce));
    expect(hex(again.sealedKey)).not.toBe(hex(envelope.sealedKey));
    expect(hex(await openVaultKeyWithRecovery(crypto, again, entropy))).toBe(hex(vmk));
  });

  it('uses the documented default cost', async () => {
    expect(DEFAULT_RECOVERY_KDF).toEqual({ opsLimit: 3, memLimitBytes: 64 * 1024 * 1024 });
    const sealed = await sealVaultKeyForRecovery(crypto, random, vmk, entropy);
    expect(sealed).toMatchObject(DEFAULT_RECOVERY_KDF);
    expect(hex(await openVaultKeyWithRecovery(crypto, sealed, entropy))).toBe(hex(vmk));
  });

  it.each([
    ['salt', (e: RecoveryEnvelope) => ({ ...e, salt: flip(e.salt) })],
    ['nonce', (e: RecoveryEnvelope) => ({ ...e, nonce: flip(e.nonce) })],
    ['ciphertext', (e: RecoveryEnvelope) => ({ ...e, sealedKey: flip(e.sealedKey) })],
    ['tag', (e: RecoveryEnvelope) => ({ ...e, sealedKey: flip(e.sealedKey, 47) })],
    ['pass count', (e: RecoveryEnvelope) => ({ ...e, opsLimit: e.opsLimit + 1 })],
    ['memory size', (e: RecoveryEnvelope) => ({ ...e, memLimitBytes: e.memLimitBytes + 1024 })],
  ])('detects a changed %s', async (_name, alter) => {
    await expect(openVaultKeyWithRecovery(crypto, alter(envelope), entropy)).rejects.toThrow(
      WrongRecoveryPhraseError,
    );
  });

  it.each([
    ['an unknown version', { version: 2 }],
    ['an unknown KDF', { kdf: 'pbkdf2' }],
    ['too few passes (downgrade)', { opsLimit: 1 }],
    ['too many passes (resource exhaustion)', { opsLimit: 11 }],
    ['too little memory (downgrade)', { memLimitBytes: 8 * 1024 * 1024 }],
    ['too much memory (resource exhaustion)', { memLimitBytes: 2 * 1024 * 1024 * 1024 }],
    ['fractional passes', { opsLimit: 2.5 }],
    ['a short salt', { salt: new Uint8Array(8) }],
    ['a short nonce', { nonce: new Uint8Array(12) }],
    ['a truncated key', { sealedKey: new Uint8Array(47) }],
    ['text in place of bytes', { salt: '00'.repeat(16) }],
  ])('rejects %s before doing any work', async (_name, change) => {
    const bad = { ...envelope, ...change } as RecoveryEnvelope;
    const spy = { ...crypto, argon2id: jest.fn(crypto.argon2id) };
    await expect(openVaultKeyWithRecovery(spy, bad, entropy)).rejects.toThrow(
      InvalidRecoveryEnvelopeError,
    );
    expect(spy.argon2id).not.toHaveBeenCalled();
    expect(() => encodeRecoveryEnvelope(bad)).toThrow(InvalidRecoveryEnvelopeError);
  });

  it('rejects weak parameters when sealing, and bad key or entropy sizes', async () => {
    await expect(
      sealVaultKeyForRecovery(crypto, random, vmk, entropy, {
        opsLimit: 1,
        memLimitBytes: 64 * 1024 * 1024,
      }),
    ).rejects.toThrow(InvalidRecoveryEnvelopeError);
    await expect(
      sealVaultKeyForRecovery(crypto, random, vmk.slice(0, 16), entropy, fastKdf),
    ).rejects.toThrow(CryptoInputError);
    await expect(
      sealVaultKeyForRecovery(crypto, random, vmk, entropy.slice(0, 16), fastKdf),
    ).rejects.toThrow(CryptoInputError);
    await expect(openVaultKeyWithRecovery(crypto, envelope, entropy.slice(0, 16))).rejects.toThrow(
      CryptoInputError,
    );
  });

  it('passes on unexpected errors unchanged', async () => {
    const broken = {
      ...crypto,
      open: () => {
        throw new RangeError('boom');
      },
    };
    await expect(openVaultKeyWithRecovery(broken, envelope, entropy)).rejects.toThrow(RangeError);
  });

  it('wipes the derived recovery key after use', async () => {
    let derived: Uint8Array | undefined;
    const spy: CryptoProvider = {
      ...crypto,
      argon2id: async (...args) => (derived = await crypto.argon2id(...args)),
    };
    await openVaultKeyWithRecovery(spy, envelope, entropy);
    expect(derived?.every((byte) => byte === 0)).toBe(true);
    await expect(
      openVaultKeyWithRecovery(spy, envelope, new FakeRandomSource(99).bytes(32)),
    ).rejects.toThrow(WrongRecoveryPhraseError);
    expect(derived?.every((byte) => byte === 0)).toBe(true);
  });
});

function flip(bytes: Uint8Array, index = 0): Uint8Array {
  const copy = bytes.slice();
  copy[index] = (copy[index] ?? 0) ^ 1;
  return copy;
}

describe('encoded envelope', () => {
  it('round-trips through JSON', async () => {
    const decoded = decodeRecoveryEnvelope(
      JSON.parse(JSON.stringify(encodeRecoveryEnvelope(envelope))),
    );
    expect(hex(decoded.salt)).toBe(hex(envelope.salt));
    expect(hex(await openVaultKeyWithRecovery(crypto, decoded, entropy))).toBe(hex(vmk));
    expect(Object.isFrozen(decoded)).toBe(true);
  });

  it.each([
    ['null', () => null],
    ['text', () => 'envelope'],
    ['a missing field', (e: Record<string, unknown>) => ({ ...e, salt: undefined })],
    [
      'uppercase hex',
      (e: Record<string, unknown>) => ({ ...e, salt: String(e.salt).toUpperCase() }),
    ],
    ['non-hex text', (e: Record<string, unknown>) => ({ ...e, nonce: 'zz'.repeat(24) })],
    [
      'a short value',
      (e: Record<string, unknown>) => ({ ...e, sealedKey: String(e.sealedKey).slice(2) }),
    ],
    ['a byte array in place of hex', (e: Record<string, unknown>) => ({ ...e, salt: [1, 2, 3] })],
    ['a weak pass count', (e: Record<string, unknown>) => ({ ...e, opsLimit: 1 })],
    ['a text pass count', (e: Record<string, unknown>) => ({ ...e, opsLimit: '3' })],
    ['an unknown version', (e: Record<string, unknown>) => ({ ...e, version: 99 })],
  ])('rejects %s', (_name, alter) => {
    const encoded = { ...encodeRecoveryEnvelope(envelope) } as Record<string, unknown>;
    expect(() => decodeRecoveryEnvelope(alter(encoded))).toThrow(InvalidRecoveryEnvelopeError);
  });
});

describe('device copy of the vault key', () => {
  it('saves and loads the key', async () => {
    const store = new FakeSecureKeyStore();
    await saveVaultKeyOnDevice(store, vmk, { requireAuth: false });
    expect(hex((await loadVaultKeyFromDevice(store)) as Uint8Array)).toBe(hex(vmk));
    expect(store.authPrompts).toBe(0);
  });

  it('prompts on every read when bound to biometrics', async () => {
    const store = new FakeSecureKeyStore();
    await saveVaultKeyOnDevice(store, vmk, { requireAuth: true });
    await loadVaultKeyFromDevice(store);
    expect(store.authPrompts).toBe(1);
    store.failNextAuth('cancelled');
    await expect(loadVaultKeyFromDevice(store)).rejects.toThrow(KeyAccessError);
  });

  it('returns null when the device has no key, so the caller asks for the phrase', async () => {
    const store = new FakeSecureKeyStore();
    expect(await loadVaultKeyFromDevice(store)).toBeNull();
    await saveVaultKeyOnDevice(store, vmk, { requireAuth: true });
    store.simulateBiometricEnrollmentChange();
    expect(await loadVaultKeyFromDevice(store)).toBeNull();
    await saveVaultKeyOnDevice(store, vmk, { requireAuth: false });
    store.simulateRestoreToNewDevice();
    expect(await loadVaultKeyFromDevice(store)).toBeNull();
  });

  it('recovers through the phrase after the device key is lost, then works again', async () => {
    const store = new FakeSecureKeyStore();
    await saveVaultKeyOnDevice(store, vmk, { requireAuth: true });
    store.simulateBiometricEnrollmentChange();
    expect(await loadVaultKeyFromDevice(store)).toBeNull();
    const recovered = await openVaultKeyWithRecovery(crypto, envelope, entropy);
    await saveVaultKeyOnDevice(store, recovered, { requireAuth: true });
    expect(hex((await loadVaultKeyFromDevice(store)) as Uint8Array)).toBe(hex(vmk));
    expect(hex(deriveVaultKeys(crypto, recovered).databaseKey)).toBe(
      hex(deriveVaultKeys(crypto, vmk).databaseKey),
    );
  });

  it('never treats a value of the wrong size as a key', async () => {
    const store = new FakeSecureKeyStore();
    await store.store(DEVICE_KEY_ALIAS, new Uint8Array(16).fill(9), { requireAuth: false });
    expect(await loadVaultKeyFromDevice(store)).toBeNull();
  });

  it('rejects saving a key of the wrong size', async () => {
    const store = new FakeSecureKeyStore();
    await expect(
      saveVaultKeyOnDevice(store, new Uint8Array(16), { requireAuth: false }),
    ).rejects.toThrow(TypeError);
    await expect(
      saveVaultKeyOnDevice(store, 'key' as unknown as Uint8Array, { requireAuth: false }),
    ).rejects.toThrow(TypeError);
  });

  it('removes the key and tolerates removing it twice', async () => {
    const store = new FakeSecureKeyStore();
    await saveVaultKeyOnDevice(store, vmk, { requireAuth: false });
    await removeVaultKeyFromDevice(store);
    await removeVaultKeyFromDevice(store);
    expect(await loadVaultKeyFromDevice(store)).toBeNull();
  });
});
