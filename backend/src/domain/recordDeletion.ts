export type RecordDeletionRequest = {
  operationId: string;
  actingUserId: string;
  recordId: string;
  creatorId: string;
  baseServerVersion: number | null;
};

export type ExistingDeletableRecord = {
  creatorId: string;
  archived: boolean;
  serverVersion: number;
} | null;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(field + ' is required.');
  return value.trim();
}

export function parseRecordDeletionRequest(value: unknown): RecordDeletionRequest {
  if (typeof value !== 'object' || value === null) throw new Error('A permanent deletion payload is required.');
  const body = value as Record<string, unknown>;
  const operationId = requiredString(body.operationId, 'operationId');
  const recordId = requiredString(body.recordId, 'recordId');
  if (!UUID_PATTERN.test(operationId) || !UUID_PATTERN.test(recordId)) throw new Error('Operation and record IDs must be UUIDs.');
  const baseVersion = body.baseServerVersion;
  if (baseVersion !== null && (!Number.isInteger(baseVersion) || Number(baseVersion) < 1)) {
    throw new Error('baseServerVersion must be null or a positive integer.');
  }
  return {
    operationId,
    actingUserId: requiredString(body.actingUserId, 'actingUserId'),
    recordId,
    creatorId: requiredString(body.creatorId, 'creatorId'),
    baseServerVersion: baseVersion === null ? null : Number(baseVersion),
  };
}

export function assertPermanentDeletionAllowed(input: RecordDeletionRequest, existing: ExistingDeletableRecord): void {
  if (input.creatorId !== input.actingUserId) throw new Error('Only the record creator can permanently delete it.');
  if (!existing) {
    if (input.baseServerVersion !== null) throw new Error('The record no longer exists on the server.');
    return;
  }
  if (existing.creatorId !== input.actingUserId) throw new Error('Only the record creator can permanently delete it.');
  if (!existing.archived) throw new Error('Only archived records can be permanently deleted.');
}

export function hasDeletionVersionConflict(input: RecordDeletionRequest, serverVersion: number): boolean {
  return input.baseServerVersion !== serverVersion;
}
