import { instant } from './instant';
import {
  INITIAL_VERSION,
  InvalidRecordError,
  isTombstoned,
  newRecordMeta,
  nextVersion,
  tombstone,
  touch,
} from './record-meta';
import { InvalidUuidError, uuid } from './uuid';

const id = uuid('017f22e2-79b0-7cc3-98c4-dc0c0c07398f');
const t = instant;

describe('record metadata', () => {
  it('starts at version 1 with equal creation and update times', () => {
    const meta = newRecordMeta(id, t(1000));
    expect(meta).toEqual({ id, createdAt: 1000, updatedAt: 1000, version: 1, deletedAt: null });
    expect(Object.isFrozen(meta)).toBe(true);
    expect(isTombstoned(meta)).toBe(false);
  });

  it('rejects an invalid id or time', () => {
    expect(() => newRecordMeta('not-a-uuid' as never, t(1000))).toThrow(InvalidUuidError);
    expect(() => newRecordMeta(id, -1 as never)).toThrow();
  });

  it('touch bumps the version and update time and keeps the rest', () => {
    const created = newRecordMeta(id, t(1000));
    const updated = touch(created, t(2000));
    expect(updated).toEqual({ id, createdAt: 1000, updatedAt: 2000, version: 2, deletedAt: null });
    expect(Object.isFrozen(updated)).toBe(true);
    expect(created.version).toBe(1); // the original is unchanged
    expect(touch(updated, t(2000)).version).toBe(3);
  });

  it('never moves the update time backwards when the clock does', () => {
    const updated = touch(newRecordMeta(id, t(5000)), t(3000));
    expect(updated.updatedAt).toBe(5000);
    expect(updated.version).toBe(2);
  });

  it('tombstones instead of deleting', () => {
    const removed = tombstone(touch(newRecordMeta(id, t(1000)), t(2000)), t(3000));
    expect(removed).toEqual({ id, createdAt: 1000, updatedAt: 3000, version: 3, deletedAt: 3000 });
    expect(isTombstoned(removed)).toBe(true);
  });

  it('refuses to change a tombstoned record', () => {
    const removed = tombstone(newRecordMeta(id, t(1000)), t(2000));
    expect(() => touch(removed, t(3000))).toThrow(InvalidRecordError);
    expect(() => tombstone(removed, t(3000))).toThrow(InvalidRecordError);
  });
});

describe('nextVersion', () => {
  it('adds one', () => {
    expect(nextVersion(INITIAL_VERSION)).toBe(2);
    expect(nextVersion(41)).toBe(42);
  });

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER, '1'])('rejects %p', (version) => {
    expect(() => nextVersion(version as number)).toThrow(InvalidRecordError);
  });
});
