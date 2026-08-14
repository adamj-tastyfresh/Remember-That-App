import type { User } from '../data/users.ts'
import type { InventoryRecord } from '../domain/inventory.ts'

type InventoryListProps = {
  records: readonly InventoryRecord[]
  currentUser: User
  archived?: boolean
  onEdit?: (record: InventoryRecord) => void
  onArchive?: (record: InventoryRecord) => void
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))
}

export function InventoryList({ records, currentUser, archived = false, onEdit, onArchive }: InventoryListProps) {
  if (records.length === 0) {
    return (
      <div className="empty-state">
        <span className="inventory-empty-icon" aria-hidden="true">□</span>
        <h3>{archived ? 'No archived inventory' : 'No inventory yet'}</h3>
        <p>{archived ? 'Archived inventory will stay available here.' : 'Add the first item and its location.'}</p>
      </div>
    )
  }

  return (
    <div className="inventory-list">
      {records.map((record) => {
        const isCreator = record.creatorId === currentUser.id
        const syncClass = 'sync-badge ' + record.syncStatus.toLowerCase().replaceAll(' ', '-')
        return (
          <article className="inventory-card" key={record.id}>
            <div className="inventory-icon" aria-hidden="true">□</div>
            <div className="inventory-card-body">
              <div className="task-card-topline">
                <span className={syncClass}><span aria-hidden="true"></span>{record.syncStatus}</span>
                <span className="task-date">{formatDate(record.serverCreatedAt ?? record.deviceCreatedAt)}</span>
              </div>
              <h3>{record.itemName}</h3>
              <p className="inventory-location"><span aria-hidden="true">⌖</span>{record.itemLocation}</p>
              {record.syncError && <p className="sync-error">{record.syncError}</p>}
              {record.conflictServerRecord && (
                <div className="conflict-comparison">
                  <div><strong>Local version</strong><span>{record.itemName}</span><p>{record.itemLocation}</p></div>
                  <div><strong>Server version</strong><span>{record.conflictServerRecord.itemName}</span><p>{record.conflictServerRecord.itemLocation}</p></div>
                </div>
              )}
              <footer>
                <span>Created by <strong>{record.creatorName}</strong></span>
                {!archived && isCreator && (
                  <div className="task-actions">
                    <button type="button" onClick={() => onEdit?.(record)}>Edit</button>
                    <button className="archive-button" type="button" onClick={() => onArchive?.(record)}>Archive</button>
                  </div>
                )}
                {!archived && !isCreator && <span className="owner-note">View only</span>}
              </footer>
            </div>
          </article>
        )
      })}
    </div>
  )
}