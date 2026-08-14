import type { InventoryRecord } from './inventory.ts'
import type { TaskRecord } from './task.ts'

export type SearchResult =
  | { type: 'task'; record: TaskRecord }
  | { type: 'inventory'; record: InventoryRecord }

function containsQuery(values: readonly string[], normalizedQuery: string): boolean {
  return values.some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
}

export function searchActiveRecords(
  tasks: readonly TaskRecord[],
  inventory: readonly InventoryRecord[],
  query: string,
): SearchResult[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) return []

  const taskResults: SearchResult[] = tasks
    .filter((task) => !task.archived && !task.pendingPermanentDeletion && containsQuery(
      [task.title, task.description, task.creatorName],
      normalizedQuery,
    ))
    .map((record) => ({ type: 'task', record }))

  const inventoryResults: SearchResult[] = inventory
    .filter((record) => !record.archived && !record.pendingPermanentDeletion && containsQuery(
      [record.itemName, record.itemLocation, record.creatorName],
      normalizedQuery,
    ))
    .map((record) => ({ type: 'inventory', record }))

  return [...taskResults, ...inventoryResults].sort((left, right) => {
    const leftDate = left.record.serverCreatedAt ?? left.record.deviceCreatedAt
    const rightDate = right.record.serverCreatedAt ?? right.record.deviceCreatedAt
    return rightDate.localeCompare(leftDate)
  })
}
