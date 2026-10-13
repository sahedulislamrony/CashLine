import type { DeviceAuth, DeviceAuthCapability } from '../device-auth';

/** Configurable DeviceAuth for tests. Defaults to a phone with a passcode and Face ID enrolled. */
export class FakeDeviceAuth implements DeviceAuth {
  constructor(
    public capability: DeviceAuthCapability = {
      deviceCredentialSet: true,
      biometricKinds: ['face'],
      biometricsEnrolled: true,
    },
  ) {}

  async getCapability(): Promise<DeviceAuthCapability> {
    return { ...this.capability, biometricKinds: [...this.capability.biometricKinds] };
  }
}
