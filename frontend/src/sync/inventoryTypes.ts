import type { InventoryRecord } from '../domain/inventory.ts'

export type InventorySyncQueueItem = {
  inventoryId: string
  operationId: string
  actingUserId: string
  record: InventoryRecord
  createdAt: string
  attempts: number
  lastAttemptAt: string | null
  lastError: string | null
  blockedByConflict: boolean
}