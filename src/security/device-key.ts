import { KEY_BYTES, keyAlias, type SecureKeyStore } from '@/application/ports';

/**
 * The device copy of the Vault Master Key, kept in the platform key store for
 * daily unlock (docs/security.md §6). It never leaves this device; on a new
 * device, or when the platform discards it, the recovery phrase is the way in.
 */
export const DEVICE_KEY_ALIAS = keyAlias('vault.master-key');

/**
 * Saves the VMK for daily unlock.
 *
 * `requireAuth` binds reading it to biometrics, enforced by the platform. It
 * is only possible when biometrics are enrolled; otherwise the key is still
 * device-only but the app cannot offer an app lock (docs/memory.md O-20).
 */
export async function saveVaultKeyOnDevice(
  keyStore: SecureKeyStore,
  vaultMasterKey: Uint8Array,
  options: { readonly requireAuth: boolean },
): Promise<void> {
  if (!(vaultMasterKey instanceof Uint8Array) || vaultMasterKey.length !== KEY_BYTES) {
    throw new TypeError('Vault master key must be 32 bytes');
  }
  await keyStore.store(DEVICE_KEY_ALIAS, vaultMasterKey, { requireAuth: options.requireAuth });
}

/**
 * Reads the VMK, prompting for biometrics if it was saved with `requireAuth`.
 * Resolves `null` when the device holds no usable key: the caller must then
 * ask for the recovery phrase. Rejects with `KeyAccessError` if the user
 * cancels or fails authentication.
 */
export async function loadVaultKeyFromDevice(keyStore: SecureKeyStore): Promise<Uint8Array | null> {
  const key = await keyStore.load(DEVICE_KEY_ALIAS);
  if (key === null) {
    return null;
  }
  if (key.length !== KEY_BYTES) {
    // A value of the wrong size is not our key. Treat it as absent, never as a key.
    key.fill(0);
    return null;
  }
  return key;
}

export async function removeVaultKeyFromDevice(keyStore: SecureKeyStore): Promise<void> {
  await keyStore.remove(DEVICE_KEY_ALIAS);
}
