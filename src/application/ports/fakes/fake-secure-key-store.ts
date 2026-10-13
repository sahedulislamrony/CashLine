import {
  KeyAccessError,
  type KeyAccessFailure,
  type KeyAlias,
  type KeyStoreOptions,
  type SecureKeyStore,
} from '../secure-key-store';

type Entry = { secret: Uint8Array; requireAuth: boolean };

/**
 * In-memory SecureKeyStore for tests. NOT secure and never shipped: lint blocks
 * imports of `fakes/` outside test files.
 *
 * It can act out the platform events the vault must survive: the user
 * cancelling a prompt, biometric enrollment changing, and the app data
 * arriving on another device without its keys.
 */
export class FakeSecureKeyStore implements SecureKeyStore {
  private readonly entries = new Map<KeyAlias, Entry>();
  private nextAuthFailure: KeyAccessFailure | null = null;
  private available = true;

  /** How many times the user would have been prompted. */
  authPrompts = 0;

  async store(alias: KeyAlias, secret: Uint8Array, options: KeyStoreOptions): Promise<void> {
    this.assertAvailable();
    if (!(secret instanceof Uint8Array) || secret.length === 0) {
      throw new TypeError('Secret must be a non-empty byte array');
    }
    // Copy in, as a real store would: later changes to the caller's buffer do not leak in.
    this.entries.set(alias, { secret: secret.slice(), requireAuth: options.requireAuth });
  }

  async load(alias: KeyAlias): Promise<Uint8Array | null> {
    this.assertAvailable();
    const entry = this.entries.get(alias);
    if (!entry) {
      return null;
    }
    if (entry.requireAuth) {
      this.authPrompts += 1;
      const failure = this.nextAuthFailure;
      this.nextAuthFailure = null;
      if (failure) {
        throw new KeyAccessError(failure);
      }
    }
    return entry.secret.slice();
  }

  async remove(alias: KeyAlias): Promise<void> {
    this.assertAvailable();
    this.entries.delete(alias);
  }

  /** The next authenticated read fails as if the user cancelled or was not recognized. */
  failNextAuth(reason: Exclude<KeyAccessFailure, 'unavailable'> = 'cancelled'): void {
    this.nextAuthFailure = reason;
  }

  /** Biometric enrollment changed: the platform discards every auth-bound secret. */
  simulateBiometricEnrollmentChange(): void {
    for (const [alias, entry] of this.entries) {
      if (entry.requireAuth) {
        this.entries.delete(alias);
      }
    }
  }

  /** App data restored onto another device: device-only secrets did not come along. */
  simulateRestoreToNewDevice(): void {
    this.entries.clear();
  }

  /** The platform store cannot be used at all. */
  setAvailable(available: boolean): void {
    this.available = available;
  }

  private assertAvailable(): void {
    if (!this.available) {
      throw new KeyAccessError('unavailable');
    }
  }
}
