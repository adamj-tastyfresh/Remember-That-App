export type TaskSyncPayload = {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  deviceCreatedAt: string;
  lastModifiedAt: string;
  archived: boolean;
  archivedAt: string | null;
  archivedBy: string | null;
  baseServerVersion: number | null;
};

export type TaskSyncRequest = {
  operationId: string;
  actingUserId: string;
  task: TaskSyncPayload;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(field + ' is required.');
  return value.trim();
}

function isoDate(value: unknown, field: string, nullable = false): string | null {
  if (nullable && value === null) return null;
  const date = requiredString(value, field);
  if (Number.isNaN(Date.parse(date))) throw new Error(field + ' must be an ISO date.');
  return date;
}

export function parseTaskSyncRequest(value: unknown): TaskSyncRequest {
  if (!isObject(value) || !isObject(value.task)) throw new Error('A task sync payload is required.');

  const operationId = requiredString(value.operationId, 'operationId');
  const id = requiredString(value.task.id, 'task.id');
  if (!UUID_PATTERN.test(operationId) || !UUID_PATTERN.test(id)) throw new Error('Operation and task IDs must be UUIDs.');

  const title = requiredString(value.task.title, 'task.title');
  if (title.length > 250) throw new Error('Task titles must be 250 characters or fewer.');

  const baseVersion = value.task.baseServerVersion;
  if (baseVersion !== null && (!Number.isInteger(baseVersion) || Number(baseVersion) < 1)) {
    throw new Error('baseServerVersion must be null or a positive integer.');
  }
  if (typeof value.task.archived !== 'boolean') throw new Error('task.archived must be true or false.');

  return {
    operationId,
    actingUserId: requiredString(value.actingUserId, 'actingUserId'),
    task: {
      id,
      title,
      description: requiredString(value.task.description, 'task.description'),
      creatorId: requiredString(value.task.creatorId, 'task.creatorId'),
      deviceCreatedAt: isoDate(value.task.deviceCreatedAt, 'task.deviceCreatedAt') as string,
      lastModifiedAt: isoDate(value.task.lastModifiedAt, 'task.lastModifiedAt') as string,
      archived: value.task.archived,
      archivedAt: isoDate(value.task.archivedAt, 'task.archivedAt', true),
      archivedBy: value.task.archivedBy === null ? null : requiredString(value.task.archivedBy, 'task.archivedBy'),
      baseServerVersion: baseVersion === null ? null : Number(baseVersion),
    },
  };
}
export type ExistingTaskVersion = {
  creatorId: string
  serverVersion: number
} | null;

export function assertTaskSyncAllowed(input: TaskSyncRequest, existing: ExistingTaskVersion): void {
  if (input.task.archived && input.task.archivedBy !== input.actingUserId) {
    throw new Error('Archived tasks must be archived by their creator.');
  }

  if (!existing) {
    if (input.task.creatorId !== input.actingUserId || input.task.baseServerVersion !== null) {
      throw new Error('New tasks must belong to the selected user.');
    }
    return;
  }

  if (existing.creatorId !== input.actingUserId || input.task.creatorId !== existing.creatorId) {
    throw new Error('Only the task creator can change this task.');
  }
}
export function hasTaskVersionConflict(input: TaskSyncRequest, existingServerVersion: number): boolean {
  return input.task.baseServerVersion !== existingServerVersion;
}