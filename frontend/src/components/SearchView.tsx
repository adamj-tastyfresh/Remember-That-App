import { useMemo, useState } from 'react'
import type { InventoryRecord } from '../domain/inventory.ts'
import { searchActiveRecords } from '../domain/search.ts'
import type { TaskRecord } from '../domain/task.ts'

type SearchViewProps = {
  tasks: readonly TaskRecord[]
  inventory: readonly InventoryRecord[]
  loading: boolean
  onOpenTask: () => void
  onOpenInventory: () => void
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))
}

export function SearchView({ tasks, inventory, loading, onOpenTask, onOpenInventory }: SearchViewProps) {
  const [query, setQuery] = useState('')
  const results = useMemo(() => searchActiveRecords(tasks, inventory, query), [inventory, query, tasks])
  const hasQuery = query.trim().length > 0

  return (
    <section className="search-view" aria-labelledby="search-heading">
      <div className="page-heading search-heading">
        <p className="eyebrow">Stored on this device</p>
        <h1 id="search-heading">Search everything</h1>
        <p>Find active tasks and inventory, even while offline.</p>
      </div>
      <label className="search-box" htmlFor="global-search">
        <span aria-hidden="true">⌕</span>
        <input
          id="global-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tasks, items, locations, or creators…"
          autoComplete="off"
          autoFocus
        />
        {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search">×</button>}
      </label>

      <div className="search-summary" aria-live="polite">
        {loading ? 'Loading local records…' : hasQuery ? `${results.length} ${results.length === 1 ? 'result' : 'results'}` : 'Type part of a word to begin'}
      </div>

      {!loading && !hasQuery && (
        <div className="empty-state search-empty"><span aria-hidden="true">⌕</span><h3>Search your local records</h3><p>Try “File” for FileMaker or “charg” for charger.</p></div>
      )}
      {!loading && hasQuery && results.length === 0 && (
        <div className="empty-state search-empty"><span aria-hidden="true">⌕</span><h3>No active records found</h3><p>Check the spelling or try a shorter part of the word.</p></div>
      )}
      {!loading && results.length > 0 && (
        <div className="search-results">
          {results.map((result) => {
            const isTask = result.type === 'task'
            const title = isTask ? result.record.title : result.record.itemName
            const detail = isTask ? result.record.description : result.record.itemLocation
            const open = isTask ? onOpenTask : onOpenInventory
            return (
              <button className="search-result-card" type="button" key={`${result.type}-${result.record.id}`} onClick={open}>
                <span className={'result-type ' + result.type}>{isTask ? 'Task' : 'Inventory'}</span>
                <div className="search-result-content">
                  <h2>{title}</h2>
                  <p>{detail}</p>
                  <small>Created by <strong>{result.record.creatorName}</strong> · {formatDate(result.record.serverCreatedAt ?? result.record.deviceCreatedAt)}</small>
                </div>
                <span className="result-arrow" aria-hidden="true">›</span>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
