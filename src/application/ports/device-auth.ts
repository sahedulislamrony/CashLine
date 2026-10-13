/**
 * Port for asking what user authentication the device offers.
 *
 * This is for deciding what to offer and explain in the UI. It must never be
 * used to unlock the vault: unlocking is enforced by the platform when a
 * secret stored with `requireAuth` is read from `SecureKeyStore`
 * (docs/security.md §6, MASVS-AUTH).
 */
export interface DeviceAuth {
  getCapability(): Promise<DeviceAuthCapability>;
}

export type BiometricKind = 'face' | 'fingerprint' | 'iris';

export type DeviceAuthCapability = {
  /** A passcode, PIN, pattern or password protects the device. */
  readonly deviceCredentialSet: boolean;
  /** Biometrics the device has hardware for. */
  readonly biometricKinds: readonly BiometricKind[];
  /** At least one biometric is enrolled and strong enough to guard a key. */
  readonly biometricsEnrolled: boolean;
};
