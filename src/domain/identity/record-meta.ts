import { instant, type Instant } from './instant';
import { uuid, type Uuid } from './uuid';

/**
 * Bookkeeping carried by every stored record: a UUIDv7 key, creation and
 * update times, a version counter, and a tombstone instead of deletion
 * (docs/architecture.md §5). This shape is what later makes sync possible.
 */
export type RecordMeta = {
  readonly id: Uuid;
  readonly createdAt: Instant;
  readonly updatedAt: Instant;
  /** Starts at 1 and goes up by one on every change. */
  readonly version: number;
  /** Set when the record is tombstoned. Rows are never deleted. */
  readonly deletedAt: Instant | null;
};

export const INITIAL_VERSION = 1;

export class InvalidRecordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRecordError';
  }
}

export function nextVersion(version: number): number {
  if (
    !Number.isSafeInteger(version) ||
    version < INITIAL_VERSION ||
    version >= Number.MAX_SAFE_INTEGER
  ) {
    throw new InvalidRecordError('Version must be a positive whole number');
  }
  return version + 1;
}

export function newRecordMeta(id: Uuid, now: Instant): RecordMeta {
  const at = instant(now);
  return Object.freeze({
    id: uuid(id),
    createdAt: at,
    updatedAt: at,
    version: INITIAL_VERSION,
    deletedAt: null,
  });
}

function change(meta: RecordMeta, now: Instant, deleted: boolean): RecordMeta {
  if (meta.deletedAt !== null) {
    throw new InvalidRecordError('A tombstoned record cannot be changed');
  }
  // If the device clock stepped backwards, never let updatedAt go back in time.
  const updatedAt = instant(Math.max(now, meta.updatedAt));
  return Object.freeze({
    ...meta,
    updatedAt,
    version: nextVersion(meta.version),
    deletedAt: deleted ? updatedAt : null,
  });
}

/** Metadata for the next saved state of a record. */
export function touch(meta: RecordMeta, now: Instant): RecordMeta {
  return change(meta, now, false);
}

/** Marks a record as removed while keeping the row. */
export function tombstone(meta: RecordMeta, now: Instant): RecordMeta {
  return change(meta, now, true);
}

export function isTombstoned(meta: RecordMeta): boolean {
  return meta.deletedAt !== null;
}
