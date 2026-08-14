import type { ServerInventorySnapshot } from '../domain/inventory.ts'
import type { InventorySyncQueueItem } from '../sync/inventoryTypes.ts'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(new RegExp('/$'), '') ?? '/api/v1'

export class InventoryApiError extends Error {
  readonly status: number
  readonly code: string
  readonly serverRecord: ServerInventorySnapshot | null

  constructor(message: string, status: number, code: string, serverRecord: ServerInventorySnapshot | null = null) {
    super(message)
    this.status = status
    this.code = code
    this.serverRecord = serverRecord
  }
}

async function readJson(response: Response): Promise<unknown> {
  try { return await response.json() } catch { return null }
}

export async function pushInventory(item: InventorySyncQueueItem): Promise<ServerInventorySnapshot> {
  const response = await fetch(API_BASE_URL + '/inventory/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operationId: item.operationId,
      actingUserId: item.actingUserId,
      inventory: {
        id: item.record.id,
        itemName: item.record.itemName,
        itemLocation: item.record.itemLocation,
        creatorId: item.record.creatorId,
        deviceCreatedAt: item.record.deviceCreatedAt,
        lastModifiedAt: item.record.lastModifiedAt,
        archived: item.record.archived,
        archivedAt: item.record.archivedAt,
        archivedBy: item.record.archivedBy,
        baseServerVersion: item.record.serverVersion,
      },
    }),
  })
  const body = await readJson(response) as { data?: ServerInventorySnapshot | { serverRecord?: ServerInventorySnapshot }; error?: { code?: string; message?: string } } | null
  if (!response.ok) {
    const conflict = body?.data && 'serverRecord' in body.data ? body.data.serverRecord ?? null : null
    throw new InventoryApiError(body?.error?.message ?? 'The inventory server rejected the update.', response.status, body?.error?.code ?? 'SYNC_FAILURE', conflict)
  }
  if (!body?.data || 'serverRecord' in body.data) throw new InventoryApiError('The inventory server returned an invalid response.', response.status, 'INVALID_RESPONSE')
  return body.data as ServerInventorySnapshot
}

export async function deleteInventoryOnServer(item: InventorySyncQueueItem): Promise<void> {
  const response = await fetch(API_BASE_URL + '/inventory/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operationId: item.operationId, actingUserId: item.actingUserId, recordId: item.inventoryId, creatorId: item.record.creatorId, baseServerVersion: item.record.serverVersion }),
  })
  const body = await readJson(response) as { data?: { serverRecord?: ServerInventorySnapshot }; error?: { code?: string; message?: string } } | null
  if (!response.ok) throw new InventoryApiError(body?.error?.message ?? 'The inventory record could not be permanently deleted.', response.status, body?.error?.code ?? 'DELETE_FAILURE', body?.data?.serverRecord ?? null)
}

export type InventoryServerState = { records: ServerInventorySnapshot[]; deletedIds: string[] }

export async function fetchServerInventory(): Promise<InventoryServerState> {
  const response = await fetch(API_BASE_URL + '/inventory', { headers: { Accept: 'application/json' } })
  const body = await readJson(response) as { data?: ServerInventorySnapshot[]; meta?: { deletedIds?: string[] }; error?: { code?: string; message?: string } } | null
  if (!response.ok) throw new InventoryApiError(body?.error?.message ?? 'The inventory server is unavailable.', response.status, body?.error?.code ?? 'SERVER_UNAVAILABLE')
  if (!Array.isArray(body?.data)) throw new InventoryApiError('The inventory server returned an invalid response.', response.status, 'INVALID_RESPONSE')
  return { records: body.data, deletedIds: Array.isArray(body.meta?.deletedIds) ? body.meta.deletedIds : [] }
}
