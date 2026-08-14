export type InventorySyncPayload = {
  id: string;
  itemName: string;
  itemLocation: string;
  creatorId: string;
  deviceCreatedAt: string;
  lastModifiedAt: string;
  archived: boolean;
  archivedAt: string | null;
  archivedBy: string | null;
  baseServerVersion: number | null;
};

export type InventorySyncRequest = {
  operationId: string;
  actingUserId: string;
  inventory: InventorySyncPayload;
};

export type ExistingInventoryVersion = {
  creatorId: string;
  serverVersion: number;
} | null;

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

export function parseInventorySyncRequest(value: unknown): InventorySyncRequest {
  if (!isObject(value) || !isObject(value.inventory)) throw new Error('An inventory sync payload is required.');
  const operationId = requiredString(value.operationId, 'operationId');
  const id = requiredString(value.inventory.id, 'inventory.id');
  if (!UUID_PATTERN.test(operationId) || !UUID_PATTERN.test(id)) throw new Error('Operation and inventory IDs must be UUIDs.');

  const itemName = requiredString(value.inventory.itemName, 'inventory.itemName');
  const itemLocation = requiredString(value.inventory.itemLocation, 'inventory.itemLocation');
  if (itemName.length > 250) throw new Error('Item names must be 250 characters or fewer.');
  if (itemLocation.length > 500) throw new Error('Item locations must be 500 characters or fewer.');

  const baseVersion = value.inventory.baseServerVersion;
  if (baseVersion !== null && (!Number.isInteger(baseVersion) || Number(baseVersion) < 1)) {
    throw new Error('baseServerVersion must be null or a positive integer.');
  }
  if (typeof value.inventory.archived !== 'boolean') throw new Error('inventory.archived must be true or false.');

  return {
    operationId,
    actingUserId: requiredString(value.actingUserId, 'actingUserId'),
    inventory: {
      id,
      itemName,
      itemLocation,
      creatorId: requiredString(value.inventory.creatorId, 'inventory.creatorId'),
      deviceCreatedAt: isoDate(value.inventory.deviceCreatedAt, 'inventory.deviceCreatedAt') as string,
      lastModifiedAt: isoDate(value.inventory.lastModifiedAt, 'inventory.lastModifiedAt') as string,
      archived: value.inventory.archived,
      archivedAt: isoDate(value.inventory.archivedAt, 'inventory.archivedAt', true),
      archivedBy: value.inventory.archivedBy === null ? null : requiredString(value.inventory.archivedBy, 'inventory.archivedBy'),
      baseServerVersion: baseVersion === null ? null : Number(baseVersion),
    },
  };
}

export function assertInventorySyncAllowed(input: InventorySyncRequest, existing: ExistingInventoryVersion): void {
  if (input.inventory.archived && input.inventory.archivedBy !== input.actingUserId) {
    throw new Error('Archived inventory must be archived by its creator.');
  }
  if (!existing) {
    if (input.inventory.creatorId !== input.actingUserId || input.inventory.baseServerVersion !== null) {
      throw new Error('New inventory records must belong to the selected user.');
    }
    return;
  }
  if (existing.creatorId !== input.actingUserId || input.inventory.creatorId !== existing.creatorId) {
    throw new Error('Only the inventory creator can change this record.');
  }
}

export function hasInventoryVersionConflict(input: InventorySyncRequest, serverVersion: number): boolean {
  return input.inventory.baseServerVersion !== serverVersion;
}