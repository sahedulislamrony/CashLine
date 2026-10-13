/** @jest-environment node */
import sodium from 'libsodium-wrappers-sumo';
import * as nodeCrypto from 'node:crypto';

import { CryptoInputError, DecryptionError, type CryptoProvider } from '@/application/ports';

import { createLibsodiumCrypto, type Sodium } from './libsodium-crypto';

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex');
const bytes = (text: string) => Uint8Array.from(Buffer.from(text, 'hex'));
const utf8 = (text: string) => new TextEncoder().encode(text);
const fill = (length: number, start: number) =>
  Uint8Array.from({ length }, (_, i) => (start + i) & 0xff);

let crypto: CryptoProvider;
beforeAll(async () => {
  crypto = await createLibsodiumCrypto(sodium as unknown as Sodium);
});

const key = fill(32, 0x80);
const nonce = fill(24, 0x40);

describe('sha256', () => {
  it('matches the FIPS 180-4 test vectors', () => {
    expect(hex(crypto.sha256(utf8('abc')))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(hex(crypto.sha256(new Uint8Array(0)))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('rejects non-byte input', () => {
    expect(() => crypto.sha256('abc' as unknown as Uint8Array)).toThrow(CryptoInputError);
  });
});

describe('argon2id', () => {
  const salt = fill(16, 1);
  const small = { opsLimit: 2, memLimitBytes: 1024 * 1024 };

  it('matches an independent implementation (OpenSSL through Node)', async () => {
    const secret = utf8('correct horse battery staple');
    const ours = await crypto.argon2id(secret, salt, small, 32);
    const reference = nodeCrypto.argon2Sync('argon2id', {
      message: secret,
      nonce: salt,
      parallelism: 1,
      tagLength: 32,
      memory: 1024, // KiB
      passes: 2,
    });
    expect(hex(ours)).toBe(hex(reference));
  });

  it('depends on the secret, the salt and both cost parameters', async () => {
    const secret = fill(32, 7);
    const base = hex(await crypto.argon2id(secret, salt, small, 32));
    expect(hex(await crypto.argon2id(secret, salt, small, 32))).toBe(base);
    expect(hex(await crypto.argon2id(fill(32, 8), salt, small, 32))).not.toBe(base);
    expect(hex(await crypto.argon2id(secret, fill(16, 2), small, 32))).not.toBe(base);
    expect(hex(await crypto.argon2id(secret, salt, { ...small, opsLimit: 3 }, 32))).not.toBe(base);
    expect(
      hex(await crypto.argon2id(secret, salt, { ...small, memLimitBytes: 2 * 1024 * 1024 }, 32)),
    ).not.toBe(base);
  });

  it('runs at the production cost of 64 MiB and 3 passes', async () => {
    const out = await crypto.argon2id(
      fill(32, 7),
      salt,
      { opsLimit: 3, memLimitBytes: 64 * 1024 * 1024 },
      32,
    );
    expect(out).toHaveLength(32);
  });

  it.each([
    ['a short salt', () => crypto.argon2id(fill(32, 0), fill(15, 0), small, 32)],
    ['a long salt', () => crypto.argon2id(fill(32, 0), fill(17, 0), small, 32)],
    ['a text secret', () => crypto.argon2id('secret' as unknown as Uint8Array, salt, small, 32)],
    ['zero passes', () => crypto.argon2id(fill(32, 0), salt, { ...small, opsLimit: 0 }, 32)],
    [
      'too little memory',
      () => crypto.argon2id(fill(32, 0), salt, { ...small, memLimitBytes: 100 }, 32),
    ],
    [
      'a fractional cost',
      () => crypto.argon2id(fill(32, 0), salt, { ...small, opsLimit: 2.5 }, 32),
    ],
    ['a tiny output', () => crypto.argon2id(fill(32, 0), salt, small, 8)],
  ])('rejects %s', async (_name, run) => {
    await expect(run()).rejects.toThrow(CryptoInputError);
  });
});

describe('seal and open (XChaCha20-Poly1305)', () => {
  const message = utf8(
    "Ladies and Gentlemen of the class of '99: If I could offer you only one tip for the future, sunscreen would be it.",
  );

  it('the underlying library matches the IETF draft test vector', () => {
    // draft-irtf-cfrg-xchacha-03, appendix A.3.1. Its associated data is not
    // valid text, so this checks the library directly rather than the adapter.
    const sealed = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      message,
      bytes('50515253c0c1c2c3c4c5c6c7'),
      null,
      nonce,
      key,
    );
    expect(hex(sealed)).toBe(
      'bd6d179d3e83d43b9576579493c0e939572a1700252bfaccbed2902c21396cbb' +
        '731c7f1b0b4aa6440bf3a82f4eda7e39ae64c6708c54c216cb96b72e1213b452' +
        '2f8c9ba40db5d945b11b69b982c1bb9e3f3fac2bc369488f76b2383565d3fff9' +
        '21f9664c97637da9768812f615c68b13b52e' +
        'c0875924c1c7987947deafd8780acf49',
    );
  });

  it('round-trips and appends a 16-byte tag', () => {
    const sealed = crypto.seal(key, nonce, message, 'header');
    expect(sealed).toHaveLength(message.length + 16);
    expect(hex(sealed.slice(0, message.length))).not.toBe(hex(message));
    expect(hex(crypto.open(key, nonce, sealed, 'header'))).toBe(hex(message));
  });

  it('handles an empty message', () => {
    const sealed = crypto.seal(key, nonce, new Uint8Array(0), '');
    expect(sealed).toHaveLength(16);
    expect(crypto.open(key, nonce, sealed, '')).toHaveLength(0);
  });

  it('rejects any change to the ciphertext, tag, key, nonce or associated data', () => {
    const sealed = crypto.seal(key, nonce, message, 'header');
    for (const index of [0, 10, sealed.length - 17, sealed.length - 16, sealed.length - 1]) {
      const altered = sealed.slice();
      altered[index] = (altered[index] ?? 0) ^ 1;
      expect(() => crypto.open(key, nonce, altered, 'header')).toThrow(DecryptionError);
    }
    expect(() => crypto.open(fill(32, 0x81), nonce, sealed, 'header')).toThrow(DecryptionError);
    expect(() => crypto.open(key, fill(24, 0x41), sealed, 'header')).toThrow(DecryptionError);
    expect(() => crypto.open(key, nonce, sealed, 'Header')).toThrow(DecryptionError);
    expect(() => crypto.open(key, nonce, sealed, '')).toThrow(DecryptionError);
    expect(() => crypto.open(key, nonce, sealed.slice(0, -1), 'header')).toThrow(DecryptionError);
    expect(() => crypto.open(key, nonce, sealed.slice(0, 5), 'header')).toThrow(DecryptionError);
  });

  it('gives a decryption error with no detail', () => {
    const sealed = crypto.seal(key, nonce, message, 'header');
    try {
      crypto.open(fill(32, 0), nonce, sealed, 'header');
      throw new Error('expected open to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(DecryptionError);
      expect((error as Error).message).toBe('Decryption failed');
    }
  });

  it.each([
    ['a 31-byte key', () => crypto.seal(fill(31, 0), nonce, message, '')],
    ['a 12-byte nonce', () => crypto.seal(key, fill(12, 0), message, '')],
    ['a text message', () => crypto.seal(key, nonce, 'hello' as unknown as Uint8Array, '')],
    ['a 33-byte key on open', () => crypto.open(fill(33, 0), nonce, fill(32, 0), '')],
    ['a 23-byte nonce on open', () => crypto.open(key, fill(23, 0), fill(32, 0), '')],
  ])('rejects %s', (_name, run) => {
    expect(run).toThrow(CryptoInputError);
  });
});

describe('deriveSubkey', () => {
  it('is repeatable and separates keys by id, context and master key', () => {
    const a = hex(crypto.deriveSubkey(key, 'cashline', 1, 32));
    expect(hex(crypto.deriveSubkey(key, 'cashline', 1, 32))).toBe(a);
    expect(hex(crypto.deriveSubkey(key, 'cashline', 2, 32))).not.toBe(a);
    expect(hex(crypto.deriveSubkey(key, 'cashlinE', 1, 32))).not.toBe(a);
    expect(hex(crypto.deriveSubkey(fill(32, 0x81), 'cashline', 1, 32))).not.toBe(a);
    expect(a).not.toBe(hex(key));
    expect(crypto.deriveSubkey(key, 'cashline', 1, 64)).toHaveLength(64);
  });

  it('is keyed BLAKE2b with the id as salt and the context as personalization', () => {
    // The construction libsodium documents for crypto_kdf, rebuilt from its BLAKE2b.
    const salt = new Uint8Array(16);
    salt[0] = 7;
    const personal = new Uint8Array(16);
    personal.set(utf8('cashline'));
    const reference = sodium.crypto_generichash_blake2b_salt_personal(32, key, salt, personal);
    expect(hex(crypto.deriveSubkey(key, 'cashline', 7, 32))).toBe(hex(reference));
  });

  it.each([
    ['a short context', () => crypto.deriveSubkey(key, 'short', 1, 32)],
    ['a long context', () => crypto.deriveSubkey(key, 'cashline!', 1, 32)],
    ['a non-ASCII context', () => crypto.deriveSubkey(key, 'cashliné', 1, 32)],
    ['a negative id', () => crypto.deriveSubkey(key, 'cashline', -1, 32)],
    ['a fractional id', () => crypto.deriveSubkey(key, 'cashline', 1.5, 32)],
    ['a short master key', () => crypto.deriveSubkey(fill(16, 0), 'cashline', 1, 32)],
    ['a tiny output', () => crypto.deriveSubkey(key, 'cashline', 1, 8)],
  ])('rejects %s', (_name, run) => {
    expect(run).toThrow(CryptoInputError);
  });
});
