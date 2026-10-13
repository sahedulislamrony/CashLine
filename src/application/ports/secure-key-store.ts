/**
 * Port for the platform's hardware-backed secret storage (iOS Keychain,
 * Android Keystore). Holds small secrets such as the wrapped vault key
 * (docs/security.md §6–§7). Byte-oriented: any text encoding is an adapter detail.
 *
 * Implementations must keep secrets on this device only, out of OS backups and
 * device transfers.
 */
export interface SecureKeyStore {
  /**
   * Stores `secret` under `alias`, replacing any previous value.
   * With `requireAuth`, reading it later needs the user to authenticate, and the
   * platform enforces that itself; it is not a check made by the app.
   */
  store(alias: KeyAlias, secret: Uint8Array, options: KeyStoreOptions): Promise<void>;

  /**
   * Returns the secret, prompting the user if it was stored with `requireAuth`.
   *
   * Resolves `null` when there is no usable secret: it was never stored, was
   * removed, did not survive a restore to another device, or was invalidated by
   * the platform (for example after biometric enrollment changed). Platforms do
   * not tell these cases apart, so callers must treat `null` as "fall back to
   * the recovery phrase".
   *
   * Rejects with `KeyAccessError` when the user cancels or fails authentication,
   * or the store cannot be used.
   */
  load(alias: KeyAlias): Promise<Uint8Array | null>;

  /** Removes the secret. Does nothing if it is absent. Never prompts. */
  remove(alias: KeyAlias): Promise<void>;
}

export type KeyStoreOptions = { readonly requireAuth: boolean };

declare const keyAliasBrand: unique symbol;

/** Name of a stored secret: lowercase letters, digits, ".", "-" and "_". */
export type KeyAlias = string & { readonly [keyAliasBrand]: true };

export function keyAlias(name: string): KeyAlias {
  if (typeof name !== 'string' || !/^[a-z][a-z0-9._-]{0,63}$/.test(name)) {
    throw new TypeError('Invalid key alias');
  }
  return name as KeyAlias;
}

export type KeyAccessFailure = 'cancelled' | 'not-authenticated' | 'unavailable';

/** Never carries the secret or the alias contents beyond its name. */
export class KeyAccessError extends Error {
  constructor(readonly reason: KeyAccessFailure) {
    super(`Secure key store access failed: ${reason}`);
    this.name = 'KeyAccessError';
  }
}
