import { createUuidGenerator, isUuid } from '@/domain/identity/uuid';

import { KeyAccessError, keyAlias } from '../secure-key-store';
import { FakeClock, FakeDeviceAuth, FakeRandomSource, FakeSecureKeyStore } from './index';

const alias = keyAlias('vault.device-key');
const other = keyAlias('other');
const secret = () => Uint8Array.from([1, 2, 3, 4]);

describe('keyAlias', () => {
  it.each(['vault', 'vault.device-key', 'a_b-c.1', 'a'])('accepts %p', (name) => {
    expect(keyAlias(name)).toBe(name);
  });

  it.each(['', 'Vault', '1vault', 'vault key', 'vault/key', 'a'.repeat(65), 'vault$'])(
    'rejects %p',
    (name) => {
      expect(() => keyAlias(name)).toThrow(TypeError);
    },
  );

  it('rejects non-string input', () => {
    expect(() => keyAlias(undefined as unknown as string)).toThrow(TypeError);
  });
});

describe('SecureKeyStore contract (FakeSecureKeyStore)', () => {
  it('returns null for a secret that was never stored', async () => {
    expect(await new FakeSecureKeyStore().load(alias)).toBeNull();
  });

  it('returns what was stored, per alias', async () => {
    const store = new FakeSecureKeyStore();
    await store.store(alias, secret(), { requireAuth: false });
    await store.store(other, Uint8Array.from([9]), { requireAuth: false });
    expect(await store.load(alias)).toEqual(secret());
    expect(await store.load(other)).toEqual(Uint8Array.from([9]));
  });

  it('replaces the previous value', async () => {
    const store = new FakeSecureKeyStore();
    await store.store(alias, secret(), { requireAuth: false });
    await store.store(alias, Uint8Array.from([7, 7]), { requireAuth: false });
    expect(await store.load(alias)).toEqual(Uint8Array.from([7, 7]));
  });

  it('does not share memory with the caller, in or out', async () => {
    const store = new FakeSecureKeyStore();
    const input = secret();
    await store.store(alias, input, { requireAuth: false });
    input.fill(0); // the caller wipes its copy
    const first = await store.load(alias);
    expect(first).toEqual(secret());
    first?.fill(0); // and wipes what it read
    expect(await store.load(alias)).toEqual(secret());
  });

  it('removes a secret and tolerates removing an absent one', async () => {
    const store = new FakeSecureKeyStore();
    await store.store(alias, secret(), { requireAuth: true });
    await store.remove(alias);
    await store.remove(alias);
    expect(await store.load(alias)).toBeNull();
    expect(store.authPrompts).toBe(0); // removal never prompts
  });

  it('rejects an empty or non-byte secret', async () => {
    const store = new FakeSecureKeyStore();
    await expect(store.store(alias, new Uint8Array(0), { requireAuth: false })).rejects.toThrow(
      TypeError,
    );
    await expect(
      store.store(alias, 'secret' as unknown as Uint8Array, { requireAuth: false }),
    ).rejects.toThrow(TypeError);
  });

  it('prompts only for secrets stored with requireAuth', async () => {
    const store = new FakeSecureKeyStore();
    await store.store(alias, secret(), { requireAuth: true });
    await store.store(other, secret(), { requireAuth: false });
    await store.load(other);
    expect(store.authPrompts).toBe(0);
    await store.load(alias);
    await store.load(alias);
    expect(store.authPrompts).toBe(2);
  });

  it.each(['cancelled', 'not-authenticated'] as const)(
    'rejects with %s when authentication fails, and keeps the secret',
    async (reason) => {
      const store = new FakeSecureKeyStore();
      await store.store(alias, secret(), { requireAuth: true });
      store.failNextAuth(reason);
      await expect(store.load(alias)).rejects.toMatchObject({ name: 'KeyAccessError', reason });
      expect(await store.load(alias)).toEqual(secret()); // the next attempt succeeds
    },
  );

  it('an authentication failure does not affect secrets that need no authentication', async () => {
    const store = new FakeSecureKeyStore();
    await store.store(other, secret(), { requireAuth: false });
    store.failNextAuth();
    expect(await store.load(other)).toEqual(secret());
  });

  it('loses auth-bound secrets when biometric enrollment changes', async () => {
    const store = new FakeSecureKeyStore();
    await store.store(alias, secret(), { requireAuth: true });
    await store.store(other, secret(), { requireAuth: false });
    store.simulateBiometricEnrollmentChange();
    expect(await store.load(alias)).toBeNull();
    expect(await store.load(other)).toEqual(secret());
  });

  it('loses every secret when the app data is restored on another device', async () => {
    const store = new FakeSecureKeyStore();
    await store.store(alias, secret(), { requireAuth: true });
    await store.store(other, secret(), { requireAuth: false });
    store.simulateRestoreToNewDevice();
    expect(await store.load(alias)).toBeNull();
    expect(await store.load(other)).toBeNull();
  });

  it('rejects every operation while the store is unavailable', async () => {
    const store = new FakeSecureKeyStore();
    await store.store(alias, secret(), { requireAuth: false });
    store.setAvailable(false);
    const unavailable = { name: 'KeyAccessError', reason: 'unavailable' };
    await expect(store.load(alias)).rejects.toMatchObject(unavailable);
    await expect(store.store(alias, secret(), { requireAuth: false })).rejects.toMatchObject(
      unavailable,
    );
    await expect(store.remove(alias)).rejects.toMatchObject(unavailable);
    store.setAvailable(true);
    expect(await store.load(alias)).toEqual(secret());
  });

  it('errors never contain the secret', async () => {
    const store = new FakeSecureKeyStore();
    await store.store(alias, secret(), { requireAuth: true });
    store.failNextAuth();
    const error = await store.load(alias).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(KeyAccessError);
    expect(JSON.stringify(error) + String(error)).not.toMatch(/1,2,3,4|AQIDBA/);
  });
});

describe('FakeDeviceAuth', () => {
  it('defaults to a device with a passcode and Face ID', async () => {
    expect(await new FakeDeviceAuth().getCapability()).toEqual({
      deviceCredentialSet: true,
      biometricKinds: ['face'],
      biometricsEnrolled: true,
    });
  });

  it('reports the configured capability as a copy', async () => {
    const auth = new FakeDeviceAuth({
      deviceCredentialSet: false,
      biometricKinds: [],
      biometricsEnrolled: false,
    });
    const capability = await auth.getCapability();
    expect(capability.deviceCredentialSet).toBe(false);
    (capability.biometricKinds as string[]).push('iris');
    expect((await auth.getCapability()).biometricKinds).toEqual([]);
    auth.capability = { ...auth.capability, deviceCredentialSet: true };
    expect((await auth.getCapability()).deviceCredentialSet).toBe(true);
  });
});

describe('FakeRandomSource', () => {
  it('returns the requested number of bytes', () => {
    const random = new FakeRandomSource();
    expect(random.bytes(0)).toHaveLength(0);
    expect(random.bytes(32)).toHaveLength(32);
    expect(random.bytes(32)).toBeInstanceOf(Uint8Array);
  });

  it('is repeatable for a seed and differs between seeds and calls', () => {
    expect(new FakeRandomSource(7).bytes(16)).toEqual(new FakeRandomSource(7).bytes(16));
    expect(new FakeRandomSource(7).bytes(16)).not.toEqual(new FakeRandomSource(8).bytes(16));
    const random = new FakeRandomSource(7);
    expect(random.bytes(16)).not.toEqual(random.bytes(16));
    expect(new FakeRandomSource(0).bytes(4)).toEqual(new FakeRandomSource(1).bytes(4));
  });

  it.each([-1, 1.5, 1025, NaN])('rejects length %p', (length) => {
    expect(() => new FakeRandomSource().bytes(length)).toThrow(RangeError);
  });

  it('drives the id generator together with the fake clock', () => {
    const clock = new FakeClock(1000);
    const random = new FakeRandomSource(42);
    const next = createUuidGenerator({
      now: () => clock.now(),
      randomBytes: (n) => random.bytes(n),
    });
    const first = next();
    clock.advance(1);
    const second = next();
    clock.set(500); // clock steps back
    const third = next();
    expect([first, second, third].every(isUuid)).toBe(true);
    expect(first < second && second < third).toBe(true);
    // Same seed and clock give the same ids: tests are repeatable.
    const again = createUuidGenerator({
      now: () => 1000,
      randomBytes: (n) => new FakeRandomSource(42).bytes(n),
    });
    expect(again()).toBe(first);
  });
});

describe('FakeClock', () => {
  it('starts at a fixed time and can be set and advanced', () => {
    const clock = new FakeClock();
    expect(clock.now()).toBe(1_760_000_000_000);
    clock.advance(60_000);
    expect(clock.now()).toBe(1_760_000_060_000);
    clock.set(5);
    expect(clock.now()).toBe(5);
  });

  it('rejects invalid times', () => {
    expect(() => new FakeClock(-1)).toThrow();
    expect(() => new FakeClock().set(1.5)).toThrow();
    expect(() => new FakeClock(0).advance(-1)).toThrow();
  });
});
